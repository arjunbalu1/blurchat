import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  sender: 'me' | 'stranger';
  text: string;
  // A "group" is a run of consecutive bubbles from the same sender. The corner
  // facing a neighbour in the group is flattened so the run reads as one stack.
  firstInGroup: boolean;
  lastInGroup: boolean;
}

export function MessageBubble({
  sender,
  text,
  firstInGroup,
  lastInGroup,
}: MessageBubbleProps) {
  const mine = sender === 'me';

  return (
    <div
      className={cn(
        'flex',
        mine ? 'justify-end' : 'justify-start',
        !firstInGroup && 'mt-0.5',
      )}
    >
      <div
        className={cn(
          'max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
          mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          mine && !firstInGroup && 'rounded-tr-md',
          mine && !lastInGroup && 'rounded-br-md',
          !mine && !firstInGroup && 'rounded-tl-md',
          !mine && !lastInGroup && 'rounded-bl-md',
        )}
      >
        {text}
      </div>
    </div>
  );
}
