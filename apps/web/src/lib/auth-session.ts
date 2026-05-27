import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { authServerClient } from '@/lib/auth-server-client';
import { logger } from '@/lib/logger';

// Forward ONLY the Cookie header — forwarding everything (Origin, Referer, etc.)
// trips Better Auth's CSRF check at the auth service.
export const getSession = cache(async () => {
  const cookie = (await headers()).get('cookie') ?? '';
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
