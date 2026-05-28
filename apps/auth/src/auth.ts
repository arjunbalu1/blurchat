import { betterAuth } from 'better-auth';
import { getOAuthState } from 'better-auth/api';
import { openAPI } from 'better-auth/plugins';
import { admin } from 'better-auth/plugins/admin';
import { anonymous } from 'better-auth/plugins/anonymous';
import { bearer } from 'better-auth/plugins/bearer';
import { jwt } from 'better-auth/plugins/jwt';
import { Pool } from 'pg';
import pino from 'pino';
import { v7 as uuidv7 } from 'uuid';
// Relative path (not @chatarooni/auth/fields) because Better Auth's migrate
// CLI uses jiti, which doesn't honor workspace path aliases.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { userAdditionalFields } from '../../../libs/core/auth/src/fields';

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

// prod: parent domain to share the session cookie across subdomains (auth ↔ app)
const cookieDomain = process.env.COOKIE_DOMAIN;

const isProd = process.env.NODE_ENV === 'production';

// Mirrors the pino config in apps/web/src/lib/logger.ts and
// libs/core/logger/src/lib/pino.config.ts — keep them in sync.
// Inlined (not a shared lib) because Better Auth's migrate CLI loads this
// file via jiti which doesn't honor workspace path aliases.
// trace_id/span_id are injected by @opentelemetry/instrumentation-pino.
const baLogger = pino({
  name: process.env.OTEL_SERVICE_NAME,
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          singleLine: true,
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
        },
      },
}).child({ context: 'better-auth' });

export const auth = betterAuth({
  appName: 'chatarooni',
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  trustedOrigins,

  logger: {
    // emit everything to pino; LOG_LEVEL (pino's level) is the single gate
    level: 'debug',
    log(level, message, ...args) {
      const meta = args.length ? { args } : {};
      if (level === 'error') baLogger.error(meta, message);
      else if (level === 'warn') baLogger.warn(meta, message);
      else if (level === 'debug') baLogger.debug(meta, message);
      else baLogger.info(meta, message);
    },
  },

  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // OAuth-only signup; password is set later via reset flow
    minPasswordLength: 8,
    // TODO: wire sendResetPassword once an email provider (Resend/Postmark/SES) is set up
  },

  // publicId = stable cross-service identity (apps/api uses this, never the
  // internal id). displayName starts as a copy of publicId; later we'll swap
  // the initialization for a random-name generator without changing consumers.
  // Shared with apps/web's auth clients via @chatarooni/auth/fields.
  user: { additionalFields: userAdditionalFields },

  // Generate publicId once at insert time, then mirror to displayName so they
  // share the value. Doing both in one before-hook avoids two independent
  // defaultValue() calls returning different UUIDs.
  // Defensive: if publicId is already set (e.g., a future code path that
  // pre-populates it), don't regenerate.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.publicId) return { data: user };
          const id = uuidv7();
          return { data: { ...user, publicId: id, displayName: id } };
        },
      },
    },
  },

  // Google activates only once its credentials are set in env
  socialProviders: {
    ...(googleId && googleSecret
      ? {
          google: {
            clientId: googleId,
            clientSecret: googleSecret,
            prompt: 'select_account', // always show the account picker
          },
        }
      : {}),
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      updateUserInfoOnLink: true,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  advanced: {
    database: { generateId: 'uuid' }, // record ids as UUIDs (not the default base62)
    // share the session cookie across subdomains (auth ↔ app); also avoids Safari ITP
    ...(cookieDomain
      ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } }
      : {}),
  },

  // Default is 100 req / 10s per IP across all endpoints — fine for general
  // traffic but leaves auth-sensitive routes wide open to brute-force / email
  // abuse. Storage is in-memory (per-process); switch to 'database' if
  // apps/auth scales horizontally so IPs can't reset by hitting a fresh instance.
  rateLimit: {
    customRules: {
      '/sign-in/email': { window: 60 * 15, max: 20 }, // brute-force gate
      '/request-password-reset': { window: 60 * 60, max: 10 }, // email-spam gate
    },
  },

  plugins: [
    admin(),
    anonymous({
      // Better Auth fires onLinkAccount whenever an anon user OAuths. Two cases:
      //   (a) Fresh OAuth account → transfer publicId/displayName forward so
      //       pre-link records (chat etc. keyed by publicId) keep working.
      //   (b) Existing OAuth account → behavior depends on user intent, which
      //       the client signals via additionalData.intent ('claim' | 'signin'):
      //         - 'claim': user wanted to upgrade anon → real, but the OAuth
      //                    account is taken. Redirect with an error.
      //         - 'signin' (or unset): user wanted to switch to their existing
      //                                 account. Silently let the merge happen
      //                                 (don't overwrite the existing publicId).
      //
      // Detect fresh vs existing by comparing user.createdAt to session.createdAt
      // — a fresh user is created at (≈) the same instant as its first session.
      onLinkAccount: async ({ anonymousUser, newUser, ctx }) => {
        const userMs = new Date(newUser.user.createdAt).getTime();
        const sessionMs = new Date(newUser.session.createdAt).getTime();
        const isFreshUser = Math.abs(sessionMs - userMs) < 1000;

        if (!isFreshUser) {
          const state = (await getOAuthState()) as { intent?: string } | null;
          if (state?.intent === 'claim') {
            // ctx.redirect (not APIError) is the only way to override Better
            // Auth's default "silent merge" behavior for OAuth callbacks.
            throw ctx.redirect(
              `${trustedOrigins[0]}/login?error=account_already_exists`,
            );
          }
          // signin intent (or unspecified): let Better Auth silently sign the
          // user into their existing account. Don't touch publicId.
          return;
        }

        // Two-step swap because publicId is UNIQUE: free anon's slot first by
        // renaming, then claim it on newUser. The anonymous() plugin deletes
        // the anon row right after this hook returns, so the placeholder is
        // fleeting.
        await ctx.context.internalAdapter.updateUser(anonymousUser.user.id, {
          publicId: `_linked_${anonymousUser.user.id}`,
        });
        await ctx.context.internalAdapter.updateUser(newUser.user.id, {
          publicId: anonymousUser.user.publicId,
          displayName: anonymousUser.user.displayName,
        });
      },
    }),
    jwt({
      jwt: {
        // sub = publicId (not the internal user.id, which changes on anon→real
        // link). Keeps the internal id fully private to apps/auth and makes the
        // token self-consistent — everything identifying the user is publicId.
        getSubject: ({ user }) => user.publicId,
        // No email — apps/api keys everything off publicId. Keeping email out
        // avoids PII in logs/traces and shrinks the leak blast-radius. If
        // moderation ever needs it, look it up via getUser(publicId).
        definePayload: ({ user }) => ({
          role: user.role,
          publicId: user.publicId,
          displayName: user.displayName,
          isAnonymous: user.isAnonymous ?? false,
        }),
      },
    }),
    bearer(),
    // dev-only interactive API reference at /api/auth/reference
    ...(!isProd ? [openAPI()] : []),
  ],
});
