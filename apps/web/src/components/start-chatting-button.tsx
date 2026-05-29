'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

// Home hero CTA. Lazy anonymous bootstrap: a marketing visitor doesn't get a
// guest DB row until they actually try to chat. Already-signed-in users (anon
// or real) pass straight through on their existing session.
export function StartChattingButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (isLoggedIn) {
      router.push('/chat');
      return;
    }

    setLoading(true);
    await authClient.signIn.anonymous(undefined, {
      onSuccess: () => router.push('/chat'),
      // Couldn't bootstrap a guest (rate limit, network) — fall back to /login
      // so the user still has a way in rather than a dead button.
      onError: () => {
        setLoading(false);
        router.push('/login');
      },
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size="xl"
      className="mt-10 font-semibold"
    >
      <span className="relative flex size-2.5" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
        <span className="relative inline-flex size-2.5 items-center justify-center rounded-full bg-primary-foreground">
          <span className="size-1.5 rounded-full bg-emerald-400" />
        </span>
      </span>
      {loading ? 'Starting your chat…' : 'Start chatting'}
    </Button>
  );
}
