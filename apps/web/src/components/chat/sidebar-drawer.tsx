'use client';

import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Mobile-only wrapper: a ☰ button that slides the sidebar in from the left over
// a scrim (Radix Dialog under the hood — focus trap + Esc for free). `children`
// is the server-rendered <ChatSidebar>, passed through so it stays a server
// component. Hidden at md+ where the sidebar is a permanent <aside>.
//
// `banner` true ⇒ the anonymous strip is pinned above the drawer (z-60). Offset
// the drawer's top by the banner's content height (pt-6 = 1.5rem; the safe-area
// inset is already paid inside ChatSidebar, so don't double it) so the two share
// the same ceiling instead of the banner covering the logo.
export function SidebarDrawer({
  children,
  banner = false,
}: {
  children: ReactNode;
  banner?: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        className={cn('w-72 gap-0 bg-card p-0', banner && 'pt-6')}
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
