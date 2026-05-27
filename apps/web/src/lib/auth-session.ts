import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { getCookieCache } from 'better-auth/cookies';
import { authServerClient } from '@/lib/auth-server-client';
import { logger } from '@/lib/logger';

const isProd = process.env.NODE_ENV === 'production';
const authSecret = process.env.BETTER_AUTH_SECRET;

// Fast path: verify the cookie-cache payload locally with the shared
// BETTER_AUTH_SECRET — skips the HTTPS hop to apps/auth on every render.
// Slow path: when the cookie is missing, expired (TTL set in apps/auth's
// session.cookieCache.maxAge), or verification throws, fall through to the
// authClient which re-issues a fresh signed cookie via the network.
export const getSession = cache(async () => {
  const headerStore = await headers();

  if (authSecret) {
    try {
      const cached = await getCookieCache(headerStore, {
        secret: authSecret,
        isSecure: isProd,
      });
      if (cached) return cached;
    } catch (err) {
      logger.warn({ err }, 'getCookieCache failed; falling back to network');
    }
  }

  // Forward ONLY the Cookie header — forwarding everything (Origin, Referer, etc.)
  // trips Better Auth's CSRF check at the auth service.
  const cookie = headerStore.get('cookie') ?? '';
  if (!cookie) return null;

  try {
    const { data } = await authServerClient.getSession({
      fetchOptions: { headers: { cookie } },
    });
    return data;
  } catch (err) {
    logger.error({ err }, 'getSession failed');
    return null;
  }
});
