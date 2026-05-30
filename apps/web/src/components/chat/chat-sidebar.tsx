import { Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { SidebarProfile } from './sidebar-profile';
import { SidebarTabs } from './sidebar-tabs';

type SidebarUser = { displayName?: string | null; isAnonymous: boolean };

// The inner content of the chat sidebar — shared verbatim by the fixed desktop
// <aside> and the mobile slide-in drawer (see SidebarDrawer). Server component;
// the interactive bits live in their own client leaves (SidebarTabs, the profile
// bar). The top padding reserves the iOS notch so the logo clears it when the
// drawer opens full-height.
//
// user === null means there's no account yet (the gender gate is up / logged
// out): the sidebar still shows nav + lists behind the gate, but drops the
// Premium upsell and profile bar — there's nothing to upsell or sign out of.
export function ChatSidebar({ user }: { user: SidebarUser | null }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <BrandMark href="/" size="md" className="px-1" />

      <SidebarTabs />

      {user && (
        <>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              <p className="text-sm font-semibold">Go Premium</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Gender filters, skip the wait, and no ads.
            </p>
            <Button size="sm" className="mt-2.5 w-full">
              Upgrade
            </Button>
          </div>

          <SidebarProfile user={user} />
        </>
      )}
    </div>
  );
}
