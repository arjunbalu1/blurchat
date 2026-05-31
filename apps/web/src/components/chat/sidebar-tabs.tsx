'use client';

import { useState, type ReactNode } from 'react';
import {
  Inbox,
  MessageSquarePlus,
  MessagesSquare,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Tab = 'chat' | 'friends';

// h-8 pills make a compact switch; they're centered in a 48px shell (see
// SidebarTabs) whose height — not the pills' — matches the "Text Chat" header
// bar, so the divider beneath still lands on the header's bottom border.
const TAB_BASE =
  'flex h-8 items-center justify-center gap-1.5 rounded-md text-base font-medium transition-colors';

// Chat / Friends switcher plus the list area beneath it. The active tab is local
// state, so the mobile drawer always reopens on "chat" — a clean, consistent
// reset rather than half-remembering the tab while losing the typed search. Both
// lists are empty placeholders until DMs and friends are wired to the backend.
export function SidebarTabs() {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* A 48px (3rem) shell — the "Text Chat" header bar's height (h-8 ☰ + py-2)
          — vertically centers a thinner switch. The SHELL's height, not the
          pills', is the alignment anchor: it keeps the divider below on the
          header's bottom border across the drawer seam in every banner state. */}
      <div className="flex h-12 flex-col justify-center">
        <div className="grid grid-cols-2 gap-1 p-1">
          <button
            type="button"
            onClick={() => setTab('chat')}
            aria-pressed={tab === 'chat'}
            className={cn(
              TAB_BASE,
              tab === 'chat'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <MessagesSquare className="size-5" />
            Chats
          </button>
          <button
            type="button"
            onClick={() => setTab('friends')}
            aria-pressed={tab === 'friends'}
            className={cn(
              TAB_BASE,
              tab === 'friends'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Users className="size-5" />
            Friends
          </button>
        </div>
      </div>

      {/* Divider — inset to the switch edges, flush to the 48px shell's bottom
          (-mt-2 cancels the gap-2). The shell matches the header bar's height, so
          this line continues the header's bottom border across the drawer seam. */}
      <div className="-mt-2 h-px shrink-0 bg-border" />

      {tab === 'chat' ? (
        <>
          <Button className="w-full justify-start gap-2">
            <MessageSquarePlus className="size-4" />
            New Chat
          </Button>
          <Section title="Direct Messages">
            <EmptyState
              icon={<Inbox className="size-9" strokeWidth={1.5} />}
              title="No messages yet"
              hint="Looks like you're the popular one here."
            />
          </Section>
        </>
      ) : (
        <>
          <div className="relative">
            <Input
              type="search"
              placeholder="Search Friends"
              aria-label="Search friends"
              className="pr-9"
            />
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Section title="Friends List">
            <EmptyState
              icon={<UserPlus className="size-9" strokeWidth={1.5} />}
              title="No friends yet"
              hint="People you add will show up here."
            />
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 text-center text-muted-foreground/40">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
