'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Ellipsis,
  Fingerprint,
  LogOut,
  Moon,
  Palette,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { AccountSheet } from './account-sheet';

type SidebarUser = {
  displayName?: string | null;
  publicId: string;
  isAnonymous: boolean;
};

// Bottom-of-sidebar profile bar (Chitchat-style): three borderless buttons —
// avatar+name (no-op for now), a settings cog (no-op for now), and a ⋯ that
// opens an upward menu (theme switch, claim shortcut for guests, logout).
// The display name is a publicId for guests until they claim/rename.
export function SidebarProfile({ user }: { user: SidebarUser }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const name = user.displayName ?? 'Guest';
  // Plan tier — everyone is "Free" until the PRO upgrade ships.
  const subtitle = 'Free';

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    // -mx-2 + px-2 makes the top divider full-bleed (cancels ChatSidebar's px-2),
    // matching the header / sidebar borders.
    <div className="-mx-2 flex items-center gap-1 border-t border-border px-2 pt-2">
      {/* avatar + name + tier — opens the account sheet. */}
      <AccountSheet
        user={{
          displayName: user.displayName ?? '',
          publicId: user.publicId,
          isAnonymous: user.isAnonymous,
        }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent active:bg-accent"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserRound className="size-6" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          </span>
        </button>
      </AccountSheet>

      {/* settings cog — one button (does nothing yet). */}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Settings"
        className="shrink-0 text-muted-foreground active:bg-accent"
      >
        <Settings className="size-6" />
      </Button>

      {/* ⋯ — opens the account menu upward. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Account menu"
            className="shrink-0 text-muted-foreground active:bg-accent data-[state=open]:bg-accent"
          >
            <Ellipsis className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        {/* Chitchat-style: span the FULL sidebar width, flush to both edges,
            base resting on the divider above the profile row. w-64 == the
            sidebar; alignOffset -8 pushes the end-aligned menu out past the
            ⋯'s p-2 gutter so its right edge meets the sidebar edge (the left,
            being full-width, meets the other). sideOffset 15 ≈ the ⋯-top →
            divider gap, so the bottom sits on the line rather than past it. */}
        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={15}
          alignOffset={-8}
          className="w-64"
        >
          {/* Theme as a day/night switch: a leading Palette glyph (matching the
              other rows' icons) + label, with the live sun (light) / moon (dark)
              riding in the switch knob. The knob icon only ever shows on a light
              thumb (sun) or dark thumb (moon), so it always contrasts.
              preventDefault keeps the menu open so the slide + in-place recolor
              are both visible; the Switch is a pointer-events-none indicator (the
              row drives it). min-h-9 levels this taller switch row with the icon
              rows (which also carry min-h-9). */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setTheme(isDark ? 'light' : 'dark');
            }}
            className="min-h-9 justify-between"
          >
            <span className="flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              Theme
            </span>
            <Switch checked={isDark} className="pointer-events-none">
              {isDark ? (
                <Moon className="size-3.5 text-slate-300" />
              ) : (
                <Sun className="size-3.5 text-primary" />
              )}
            </Switch>
          </DropdownMenuItem>
          {user.isAnonymous && (
            <DropdownMenuItem asChild className="min-h-9">
              <Link href="/login?intent=claim">
                <Fingerprint className="size-4 text-primary" />
                Claim account
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleSignOut}
            className="min-h-9"
          >
            <LogOut className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
