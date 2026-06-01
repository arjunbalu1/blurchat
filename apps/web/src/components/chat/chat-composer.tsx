'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_LEN = 2000;
const MAX_HEIGHT = 160; // ~6 lines, then the textarea scrolls internally

interface ChatComposerProps {
  disabled?: boolean;
  onSend: (text: string) => void;
  // Fired on any keystroke — lets the parent disarm a pending skip-confirm.
  onActivity?: () => void;
}

export function ChatComposer({
  disabled = false,
  onSend,
  onActivity,
}: ChatComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');

  // Autogrow: reset to auto so shrinking works, then grow to content up to the
  // cap. Past the cap the textarea scrolls internally (its scrollbar is hidden
  // below so nothing renders to the right of the send button).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  // Focus when the box becomes usable (on start), not while disabled.
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline. Guard isComposing so picking
    // an IME candidate with Enter doesn't fire off a half-typed message.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const hasText = value.trim().length > 0;

  return (
    // One box, one control: a borderless textarea on the left and the send
    // action as a full-height column on the right. items-stretch makes the send
    // column grow with the box as it gains lines; the icon stays centered. The
    // textarea's scrollbar is hidden so it never sits beside the send icon.
    <div
      className={cn(
        'flex flex-1 items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] dark:bg-input/30',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        disabled && 'opacity-50',
      )}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        maxLength={MAX_LEN}
        onChange={(e) => {
          setValue(e.target.value);
          onActivity?.();
        }}
        onKeyDown={onKeyDown}
        placeholder={disabled ? 'Chat ended' : 'Type a message…'}
        aria-label="Message"
        className={cn(
          'flex-1 resize-none bg-transparent py-2 pl-3.5 pr-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      />
      {hasText && !disabled && (
        <button
          type="button"
          onClick={submit}
          aria-label="Send message"
          className="flex shrink-0 items-center px-3 text-primary transition-colors hover:text-primary/80"
        >
          <SendHorizontal className="size-5" />
        </button>
      )}
    </div>
  );
}
