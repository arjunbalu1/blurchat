'use client';

import { useCallback, useState } from 'react';

export type ChatStatus = 'idle' | 'chatting' | 'ended';

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
  skip: () => void;
  send: (text: string) => void;
}

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

  // Start (or restart) a chat. There's no matchmaker yet — without a backend
  // this drops straight into chatting (no auto-match / search step). The real WS
  // will replace this with a `matched` event before flipping to chatting.
  const start = useCallback(() => {
    setPartnerTyping(false);
    setItems([matchedLine()]);
    setStatus('chatting');
  }, []);

  // Leave the current stranger. Freezes the transcript and waits for the user to
  // start a new chat — nothing auto-matches.
  const skip = useCallback(() => {
    setPartnerTyping(false);
    setItems((prev) => [
      ...prev,
      { kind: 'system', id: newId(), text: 'You skipped.' },
    ]);
    setStatus('ended');
  }, []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      { kind: 'message', id: newId(), sender: 'me', text: trimmed },
    ]);
  }, []);

  return { status, items, partnerTyping, start, skip, send };
}
