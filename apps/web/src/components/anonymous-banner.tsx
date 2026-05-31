import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Full-width nudge shown above the app surface for anonymous (guest) accounts:
// a heads-up + a single "Claim account" CTA, so the guest upgrades before their
// data is lost on logout. Claim → /login?intent=claim puts the form in claim mode
// (linkSocial): it upgrades this guest in place, or errors WITHOUT signing in if
// the chosen provider already belongs to someone else. The "I already have an
// account" path (Login) lives in the ⋯ profile menu, not here.
export function AnonymousBanner() {
  return (
    // z-60 pins the strip above the mobile drawer; pointer-events-auto re-enables
    // its CTA when the drawer (a Vaul modal) freezes the page body with
    // pointer-events:none — else "Claim account" is dead while the drawer is open.
    <div className="pointer-events-auto relative z-60 flex w-full items-center justify-center gap-2 bg-primary px-3 pb-1 pt-[calc(0.25rem+env(safe-area-inset-top))] text-xs font-medium text-primary-foreground">
      <span className="flex min-w-0 items-center gap-1.5">
        <TriangleAlert className="size-3.5 shrink-0" />
        <span className="truncate">Don&apos;t lose your chats</span>
      </span>
      <Button
        asChild
        size="xs"
        variant="secondary"
        className="shrink-0 px-2 text-xs shadow-sm"
      >
        <Link href="/login?intent=claim">Claim account</Link>
      </Button>
    </div>
  );
}
