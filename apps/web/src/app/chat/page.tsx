import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-session';
import { AnonymousBanner } from '@/components/anonymous-banner';
import { SessionRefresh } from '@/components/session-refresh';

export const metadata: Metadata = {
  title: 'Chat',
  robots: { index: false, follow: false },
};

// Plain route (like /login) — no marketing chrome, no route group. The page
// owns its own full-screen layout, rendering directly under the root layout.
export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const [session, sp] = await Promise.all([getSession(), searchParams]);
  // ?upgraded=1 → arrived here right after an anon→real transition (claim or
  // sign-in). The DB is updated but the cached session cookie still holds the
  // pre-transition snapshot (stale publicId/displayName/isAnonymous), since
  // neither linkSocial nor the onLinkAccount swap re-issues it. SessionRefresh
  // (below) forces a fresh cookie; the flag also suppresses the banner on this
  // first paint so it doesn't flash before that refresh lands.
  const justUpgraded = sp.upgraded === '1';
  const isAnonymous = !justUpgraded && (session?.user?.isAnonymous ?? false);

  return (
    <div className="flex h-svh flex-col">
      {justUpgraded && <SessionRefresh />}
      {isAnonymous && <AnonymousBanner />}
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">Chat goes here.</p>
      </main>
    </div>
  );
}
