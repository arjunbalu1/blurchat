'use client';

import { LogOut, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatControlsProps {
  status: 'chatting' | 'ended';
  onEnd: () => void;
  onNext: () => void;
  onLeave: () => void;
}

// The action bar that sits between the transcript and the composer. While
// chatting it offers End (back to idle, via the ended screen) and Skip (find a
// new stranger). Once ended it offers Leave (idle) and Find another (search).
export function ChatControls({
  status,
  onEnd,
  onNext,
  onLeave,
}: ChatControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
      {status === 'chatting' ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEnd}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="size-4" />
            End
          </Button>
          <Button variant="outline" size="sm" onClick={onNext}>
            Skip
            <SkipForward className="size-4" />
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeave}
            className="text-muted-foreground"
          >
            Leave
          </Button>
          <Button size="sm" onClick={onNext}>
            <RotateCcw className="size-4" />
            Find another
          </Button>
        </>
      )}
    </div>
  );
}
