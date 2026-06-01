'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatStatus = 'idle' | 'searching' | 'chatting' | 'ended';

export interface ChatMessage {
  kind: 'message';
  id: string;
  sender: 'me' | 'stranger';
  text: string;
}

export interface ChatSystemEvent {
  kind: 'system';
  id: string;
  text: string;
}

export type TranscriptItem = ChatMessage | ChatSystemEvent;

export interface ChatSession {
  status: ChatStatus;
  items: TranscriptItem[];
  partnerTyping: boolean;
  start: () => void;
  cancel: () => void;
  skip: () => void;
  send: (text: string) => void;
}

// How long the "finding someone…" animation shows before pairing. This timer is
// the single seam where the real WebSocket takes over: instead of a setTimeout
// resolving to chatting, a `matched` server event will. No stranger MESSAGES are
// fabricated — only the lifecycle transition that makes chatting reachable.
const MATCH_DELAY_MS = 1500;

const newId = () => crypto.randomUUID();

const matchedLine = (): ChatSystemEvent => ({
  kind: 'system',
  id: newId(),
  text: "You're now chatting with a random stranger. Say hi!",
});

export function useChatSession(): ChatSession {
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // Start (or restart) a chat: show the finding animation, then land in chatting.
  // Pressing Start is always required — a skip never auto-rematches.
  const start = useCallback(() => {
    clearTimer();
    setPartnerTyping(false);
    setItems([]);
    setStatus('searching');
    timer.current = setTimeout(() => {
      timer.current = null;
      setItems([matchedLine()]);
      setStatus('chatting');
    }, MATCH_DELAY_MS);
  }, [clearTimer]);

  // Bail out of the finding animation back to the idle screen.
  const cancel = useCallback(() => {
    clearTimer();
    setStatus('idle');
  }, [clearTimer]);

  // Leave the current stranger. Clears the transcript and waits for the user to
  // press Start again — nothing auto-matches.
  const skip = useCallback(() => {
    clearTimer();
    setPartnerTyping(false);
    setItems([]);
    setStatus('ended');
  }, [clearTimer]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      { kind: 'message', id: newId(), sender: 'me', text: trimmed },
    ]);
  }, []);

  return { status, items, partnerTyping, start, cancel, skip, send };
}
