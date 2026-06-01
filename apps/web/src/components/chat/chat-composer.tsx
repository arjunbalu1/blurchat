'use client';

import { useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_LEN = 2000;
const MAX_HEIGHT = 160; // ~6 lines, then the textarea scrolls internally

interface ChatComposerProps {
  onSend: (text: string) => void;
}

export function ChatComposer({ onSend }: ChatComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');

  // Autogrow: reset to auto so shrinking works, then grow to content up to the
  // cap. Runs on every value change (typing, send-clear, paste).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  // The composer only mounts once matched, so focus it the moment it appears.
  useEffect(() => {
    ref.current?.focus();
  }, []);

  function submit() {
    const text = value.trim();
    if (!text) return;
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

  const nearLimit = value.length > MAX_LEN - 200;

  return (
    <div className="border-t border-border px-3 py-3">
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={ref}
            rows={1}
            value={value}
            maxLength={MAX_LEN}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            aria-label="Message"
            className={cn(
              'w-full resize-none rounded-2xl border border-input bg-transparent px-3.5 py-2 text-sm leading-relaxed shadow-xs outline-none transition-[color,box-shadow]',
              'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30',
            )}
          />
          {nearLimit && (
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">
              {value.length}/{MAX_LEN}
            </span>
          )}
        </div>
        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={value.trim().length === 0}
          aria-label="Send message"
          className="rounded-full"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
