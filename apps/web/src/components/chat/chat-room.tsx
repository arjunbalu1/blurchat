'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatSession } from './use-chat-session';
import { ChatTranscript } from './chat-transcript';
import { ChatControls } from './chat-controls';
import { ChatComposer } from './chat-composer';

// Root of the conversation surface — replaces the placeholder in chat/page.tsx.
// Owns the session state machine and renders the stage for the current status.
export function ChatRoom() {
  const session = useChatSession();
  const { status, next } = session;

  // Esc skips to a new stranger while chatting (Omegle muscle memory).
  useEffect(() => {
    if (status !== 'chatting') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, next]);

  if (status === 'idle') {
    return <IdleHero onStart={session.start} />;
  }

  if (status === 'searching') {
    return <Searching onCancel={session.cancel} />;
  }

  // chatting | ended
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatTranscript items={session.items} partnerTyping={session.partnerTyping} />
      <ChatControls
        status={status}
        onEnd={session.end}
        onNext={session.next}
        onLeave={session.leave}
      />
      {status === 'chatting' && <ChatComposer onSend={session.send} />}
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
