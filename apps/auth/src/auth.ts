import { betterAuth } from 'better-auth';
import { openAPI } from 'better-auth/plugins';
import { admin } from 'better-auth/plugins/admin';
import { bearer } from 'better-auth/plugins/bearer';
import { jwt } from 'better-auth/plugins/jwt';
import { Pool } from 'pg';
import pino from 'pino';

const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;

// prod: parent domain to share the session cookie across subdomains (auth ↔ app)
const cookieDomain = process.env.COOKIE_DOMAIN;

const isProd = process.env.NODE_ENV === 'production';

// Better Auth runs outside Nest DI and is loaded by the migrate CLI (which
// can't resolve the @chatarooni/logger path alias), so it gets its own inline
// pino instance — mirrors @chatarooni/logger's config (level / transport).
// trace_id/span_id are injected by @opentelemetry/instrumentation-pino, not here.
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
    minPasswordLength: 8,
    requireEmailVerification: false, // no email service wired yet
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

  plugins: [
    admin(),
    jwt({
      jwt: {
        definePayload: ({ user }) => ({
          email: user.email,
          role: user.role,
        }),
      },
    }),
    bearer(),
    // dev-only interactive API reference at /api/auth/reference
    ...(!isProd ? [openAPI()] : []),
  ],
});
