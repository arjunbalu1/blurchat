'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChatSession } from './use-chat-session';
import { ChatTranscript } from './chat-transcript';
import { ChatComposer } from './chat-composer';

// Root of the conversation surface — replaces the placeholder in chat/page.tsx.
// Owns the session state machine and renders the stage for the current status.
export function ChatRoom() {
  const session = useChatSession();
  const { status, start, cancel, skip } = session;
  const chatting = status === 'chatting';

  // The left-of-box control is a two-step confirm while chatting: first
  // press/Esc arms "Confirm", a second commits the skip. Esc also starts (idle/
  // ended) and cancels the finding animation (searching).
  const [confirming, setConfirming] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (status === 'chatting') {
        if (confirming) skip();
        else setConfirming(true);
      } else if (status === 'searching') {
        cancel();
      } else {
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, confirming, skip, start, cancel]);

  // Leaving the chatting state clears any half-armed confirm.
  useEffect(() => {
    if (status !== 'chatting') setConfirming(false);
  }, [status]);

  // Once armed, a click anywhere outside the control disarms it (typing does too
  // — see onActivity). Only a second press on it, or Esc, commits the skip.
  useEffect(() => {
    if (!confirming) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!pillRef.current?.contains(e.target as Node)) setConfirming(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [confirming]);

  if (status === 'idle') {
    return <IdleHero onStart={start} />;
  }

  if (status === 'searching') {
    return <Searching onCancel={cancel} />;
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
      {/* Mirror the sidebar's bottom rhythm so this top divider lines up with the
          sidebar profile bar's: same pt-2 under the border, same pb float. */}
      <div className="border-t border-border px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          {/* Action with an attached ESC hint (the key fires it too). Fixed
              width so swapping the label never resizes and shoves the box; the
              ESC cap is desktop-only — touch devices have no Esc key. */}
          <div
            ref={pillRef}
            className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-md text-sm font-medium focus-within:ring-2 focus-within:ring-ring/50"
          >
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
                'flex w-16 items-center justify-center whitespace-nowrap outline-none transition-colors',
                action.cls,
              )}
            >
              {action.label}
            </button>
          </div>
          <ChatComposer
            disabled={!chatting}
            onSend={session.send}
            onActivity={() => setConfirming(false)}
          />
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
          <span className="relative inline-flex size-2.5 items-center justify-center rounded-full bg-primary-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400" />
          </span>
        </span>
        Start chatting
      </Button>
    </div>
  );
}

function Searching({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <Loader2 className="size-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Looking for someone to chat with…
      </p>
      <Button variant="outline" size="lg" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
