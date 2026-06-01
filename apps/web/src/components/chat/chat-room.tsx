'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useChatSession } from './use-chat-session';
import { ChatTranscript } from './chat-transcript';
import { ChatComposer } from './chat-composer';

// Root of the conversation surface — replaces the placeholder in chat/page.tsx.
// Owns the session state machine and renders the stage for the current status.
export function ChatRoom() {
  const session = useChatSession();
  const { status, start, skip } = session;
  const chatting = status === 'chatting';

  // The left-of-box control is a two-step confirm while chatting: first
  // press/Esc arms "Confirm", a second commits the skip. Leaving the chatting
  // state clears any half-armed confirm.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!chatting) {
      setConfirming(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (confirming) skip();
      else setConfirming(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chatting, confirming, skip]);

  if (status === 'idle') {
    return <IdleHero onStart={start} />;
  }

  // The single control cycles Skip → Confirm → (skip) → Start → (start) → Skip.
  const onPrimary = () => {
    if (!chatting) start();
    else if (confirming) skip();
    else setConfirming(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatTranscript items={session.items} partnerTyping={session.partnerTyping} />
      <div className="border-t border-border px-3 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <Button
            type="button"
            size="lg"
            variant={!chatting ? 'default' : confirming ? 'destructive' : 'outline'}
            onClick={onPrimary}
            className="shrink-0"
          >
            {!chatting ? 'Start' : confirming ? 'Confirm' : 'Skip'}
          </Button>
          <ChatComposer disabled={!chatting} onSend={session.send} />
        </div>
      </div>
    </div>
  );
}

function IdleHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <Image
        src="/mascots/orange.png"
        alt=""
        width={160}
        height={160}
        priority
        className="size-32 object-contain opacity-90 sm:size-40"
      />
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">Ready to meet someone new?</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          We&apos;ll drop you into a chat with a random stranger.
        </p>
      </div>
      <Button size="xl" onClick={onStart} className="font-semibold">
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary-foreground" />
        </span>
        Start chatting
      </Button>
    </div>
  );
}
