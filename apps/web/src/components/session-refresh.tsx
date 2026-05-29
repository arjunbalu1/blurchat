'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

// Runs once after an anon → real transition (claim via linkSocial, or sign-in
// via signIn.social Path A/B). The session cookie is set during the OAuth
// callback BEFORE the identity is finalized (linkSocial doesn't re-issue it;
// onLinkAccount's publicId swap happens after), so the cached blob is stale —
// wrong publicId/displayName/isAnonymous for up to cookieCache.maxAge. A
// get-session call with disableCookieCache bypasses the stale cache, reads the
// DB, and re-issues a fresh cookie (verified in better-auth session.mjs); then
// we re-render so server components see the real account immediately.
export function SessionRefresh() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      await authClient.getSession({ query: { disableCookieCache: true } });
      router.replace('/chat'); // drop ?upgraded=1
      router.refresh();
    })();
  }, [router]);

  return null;
}
