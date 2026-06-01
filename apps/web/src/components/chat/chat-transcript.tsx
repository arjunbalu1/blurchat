'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptItem } from './use-chat-session';
import { MessageBubble } from './message-bubble';
import { SystemLine } from './system-line';
import { TypingIndicator } from './typing-indicator';

interface ChatTranscriptProps {
  items: TranscriptItem[];
  partnerTyping: boolean;
}

export function ChatTranscript({ items, partnerTyping }: ChatTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the latest content in view. v1 always pins to bottom on new content —
  // no "scroll up to read history" exception (YAGNI).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [items, partnerTyping]);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="mx-auto flex max-w-2xl flex-col">
        {items.map((item, i) => {
          if (item.kind === 'system') {
            return <SystemLine key={item.id} text={item.text} />;
          }

          const prev = items[i - 1];
          const next = items[i + 1];
          const firstInGroup =
            !prev || prev.kind !== 'message' || prev.sender !== item.sender;
          const lastInGroup =
            !next || next.kind !== 'message' || next.sender !== item.sender;

          return (
            <MessageBubble
              key={item.id}
              sender={item.sender}
              text={item.text}
              firstInGroup={firstInGroup}
              lastInGroup={lastInGroup}
            />
          );
        })}
        {partnerTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
