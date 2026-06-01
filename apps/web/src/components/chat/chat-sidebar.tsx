import { Button } from '@/components/ui/button';
import { SidebarProfile } from './sidebar-profile';
import { SidebarTabs } from './sidebar-tabs';

type SidebarUser = {
  displayName?: string | null;
  publicId: string;
  isAnonymous: boolean;
};

// The inner content of the chat sidebar — shared verbatim by the fixed desktop
// <aside> and the mobile slide-in drawer (see SidebarDrawer). Server component;
// the interactive bits live in their own client leaves (SidebarTabs, the profile
// bar). Top padding is JUST the safe-area inset (no extra 0.75rem) so the
// Chat/Friends toggle starts flush at the content top — at the same Y as the
// "Text Chat" header bar. Same height ⇒ the toggle's bottom == the header's
// bottom border, so the divider under it traces that line across the drawer
// seam in every banner state. The drawer wrapper adds the banner offset on top.
//
// user === null means there's no account yet (the gender gate is up / logged
// out): the sidebar still shows nav + lists behind the gate, but drops the
// Premium upsell and profile bar — there's nothing to upsell or sign out of.
export function ChatSidebar({ user }: { user: SidebarUser | null }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-2 pt-[env(safe-area-inset-top)] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {/* No logo here — on desktop it lives in the top header bar (see page.tsx);
          the mobile drawer intentionally omits it (the ☰ bar shows context). */}
      <SidebarTabs />

      {user && (
        <>
          {/* Desktop: an orange-tinted upsell card (border + tint + blurb).
              md:-mx-1 nudges the box ~4px past the gutter (a touch wider than
              the toggle / New Chat) and md:-mb-1 pulls it ~4px down toward the
              profile bar; md:px-2 pads the content in from the border. Mobile
              drawer: strip the box and blurb (md:-only) — just the chip. */}
          <div className="md:-mx-1 md:-mb-1 md:rounded-lg md:border md:border-primary/30 md:bg-primary/5 md:px-2 md:py-1">
            <p className="text-balance text-sm leading-snug text-muted-foreground max-md:hidden">
              Gender filters, fast queue, no ads.
            </p>
            {/* Neutral chip that flips black/white with the theme, so the orange
                PRO stays legible on either. Text mirrors the wordmark —
                "Chatarooni" in foreground, the suffix in primary (cf.
                Chatarooni<span>.com</span> in BrandMark). bg-transparent +
                hover:bg-transparent drop the Button variant's bg-primary /
                hover:bg-primary so only the gradient paints (the real hover is
                opacity). */}
            <Button
              size="lg"
              className="w-full border border-border bg-transparent bg-linear-to-b from-white to-neutral-100 text-base font-semibold text-foreground shadow-sm transition-opacity hover:bg-transparent hover:opacity-90 md:mt-2 dark:from-neutral-900 dark:to-neutral-950"
            >
              <span>
                Get Chatarooni{' '}
                <span className="font-bold text-primary">PRO</span>
              </span>
            </Button>
          </div>

          <SidebarProfile user={user} />
        </>
      )}
    </div>
  );
}
