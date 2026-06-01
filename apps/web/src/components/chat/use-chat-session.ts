'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatStatus = 'idle' | 'searching' | 'chatting' | 'ended';
export type EndedReason = 'self' | 'partner';

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
  endedReason: EndedReason | null;
  start: () => void;
  cancel: () => void;
  next: () => void;
  end: () => void;
  leave: () => void;
  send: (text: string) => void;
}

// How long the simulated matchmaker "searches" before pairing. This timer is the
// single seam where the real WebSocket takes over: instead of a setTimeout
// resolving to `chatting`, a `matched` server event will. No stranger MESSAGES
// are fabricated here — only the lifecycle transition that makes the chatting
// state reachable without a backend.
const MATCH_DELAY_MS = 1200;

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
  const [endedReason, setEndedReason] = useState<EndedReason | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // start() and next() are the same transition: drop any prior chat, show the
  // searching state, then (timer → WS event later) land in chatting.
  const beginSearch = useCallback(() => {
    clearTimer();
    setItems([]);
    setPartnerTyping(false);
    setEndedReason(null);
    setStatus('searching');
    timer.current = setTimeout(() => {
      timer.current = null;
      setItems([matchedLine()]);
      setStatus('chatting');
    }, MATCH_DELAY_MS);
  }, [clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    setStatus('idle');
  }, [clearTimer]);

  const end = useCallback(() => {
    clearTimer();
    setPartnerTyping(false);
    setEndedReason('self');
    setItems((prev) => [
      ...prev,
      { kind: 'system', id: newId(), text: 'You ended the chat.' },
    ]);
    setStatus('ended');
  }, [clearTimer]);

  const leave = useCallback(() => {
    clearTimer();
    setItems([]);
    setEndedReason(null);
    setStatus('idle');
  }, [clearTimer]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      { kind: 'message', id: newId(), sender: 'me', text: trimmed },
    ]);
  }, []);

  return {
    status,
    items,
    partnerTyping,
    endedReason,
    start: beginSearch,
    cancel,
    next: beginSearch,
    end,
    leave,
    send,
  };
}
