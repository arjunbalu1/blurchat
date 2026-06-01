'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { TranscriptItem } from './use-chat-session';
import { MessageBubble } from './message-bubble';
import { SystemLine } from './system-line';
import { TypingIndicator } from './typing-indicator';

interface ChatTranscriptProps {
  items: TranscriptItem[];
  partnerTyping: boolean;
}

export function ChatTranscript({ items, partnerTyping }: ChatTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const pinToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Pin to the latest content on new items/typing. v1 always pins to bottom —
  // no "scroll up to read history" exception (YAGNI).
  useEffect(() => {
    pinToBottom();
  }, [items, partnerTyping, pinToBottom]);

  // …and whenever this pane resizes — e.g. the composer grows and shrinks it —
  // so the newest message is pushed up and stays above the composer instead of
  // sliding under it.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(pinToBottom);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pinToBottom]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      <div className="flex flex-col">
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
      </div>
    </div>
  );
}
