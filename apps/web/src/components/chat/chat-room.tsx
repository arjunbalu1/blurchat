'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  // press/Esc arms "Confirm", a second commits the skip. When not chatting, Esc
  // (and the button) starts/restarts a chat.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (status === 'chatting') {
        if (confirming) skip();
        else setConfirming(true);
      } else {
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, confirming, skip, start]);

  // Leaving the chatting state clears any half-armed confirm.
  useEffect(() => {
    if (status !== 'chatting') setConfirming(false);
  }, [status]);

  if (status === 'idle') {
    return <IdleHero onStart={start} />;
  }

  // The single control cycles Skip → Confirm → (skip) → Start → (start) → Skip.
  const onPrimary = () => {
    if (!chatting) start();
    else if (confirming) skip();
    else setConfirming(true);
  };

  const action = !chatting
    ? { label: 'Start', cls: 'bg-primary text-primary-foreground hover:bg-primary/90' }
    : confirming
      ? { label: 'Confirm', cls: 'bg-destructive text-white hover:bg-destructive/90' }
      : { label: 'Skip', cls: 'bg-primary text-primary-foreground hover:bg-primary/90' };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatTranscript items={session.items} partnerTyping={session.partnerTyping} />
      <div className="border-t border-border px-3 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          {/* Action with an attached ESC hint (the key fires it too). Fixed
              width so swapping the label never resizes and shoves the box; the
              ESC cap is desktop-only — touch devices have no Esc key. */}
          <div className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-md text-sm font-medium focus-within:ring-2 focus-within:ring-ring/50">
            <kbd
              aria-hidden="true"
              className="hidden select-none items-center bg-neutral-700 px-2 font-sans text-xs font-semibold tracking-wide text-neutral-100 sm:flex"
            >
              ESC
            </kbd>
            <button
              type="button"
              onClick={onPrimary}
              className={cn(
                'flex w-20 items-center justify-center outline-none transition-colors',
                action.cls,
              )}
            >
              {action.label}
            </button>
          </div>
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
