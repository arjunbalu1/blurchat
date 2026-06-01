'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  Check,
  Fingerprint,
  LogOut,
  Moon,
  Palette,
  Pencil,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const MIN = 3;
const MAX = 20;

type AccountUser = {
  displayName: string;
  publicId: string;
  isAnonymous: boolean;
};

const ROW =
  'flex w-full items-center gap-3 px-3.5 py-2.5 text-sm transition-colors';
const ROW_BTN = `${ROW} hover:bg-accent active:bg-accent`;

// publicId is a UUIDv7 (apps/auth sets it via uuidv7()); its first 48 bits hold
// the creation time in Unix ms, and it survives the anon->real claim — so this
// is the true join moment. Couples to the v7 format: if ID generation ever
// changes, revisit (the canonical source is the user's createdAt column).
function joinedLabel(publicId: string): string {
  const ms = parseInt(publicId.replace(/-/g, '').slice(0, 12), 16);
  return new Date(ms).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Account/settings sheet opened by the sidebar avatar+name button. It IS the
// same Card the gender gate (BeforeYouStart) and login use — Radix Dialog only
// supplies the dismissible-modal plumbing (scrim, ESC, focus trap, scroll lock)
// that the mandatory gate doesn't need. Bottom sheet on mobile, centered card on
// sm+, matching the gate's shape. The display name is editable inline
// (authClient.updateUser).
export function AccountSheet({
  user,
  children,
}: {
  user: AccountUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each time we enter edit mode, seed the live name and select-all so a guest
  // (whose name is a long publicId) can type over it in one keystroke.
  useEffect(() => {
    if (!editing) return;
    setValue(user.displayName);
    setError(null);
    const id = requestAnimationFrame(() => inputRef.current?.select());
    return () => cancelAnimationFrame(id);
  }, [editing, user.displayName]);

  // Leaving the sheet drops any in-progress edit.
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setEditing(false);
      setError(null);
    }
  };

  // Mirror apps/auth's databaseHooks.user.update.before (trim + collapse, 3-20).
  const normalized = value.trim().replace(/\s+/g, ' ');
  const invalid = normalized.length < MIN || normalized.length > MAX;
  const unchanged = normalized === user.displayName;

  const handleSave = async () => {
    if (invalid || unchanged || saving) return;
    setSaving(true);
    setError(null);
    await authClient.updateUser(
      { displayName: normalized },
      {
        onSuccess: async () => {
          // updateUser writes the DB but doesn't re-issue the session cookie
          // cache; force a fresh read so the server-rendered sidebar shows the
          // new name (same trick as SessionRefresh).
          await authClient.getSession({ query: { disableCookieCache: true } });
          setSaving(false);
          setEditing(false);
          router.refresh();
        },
        onError: (ctx) => {
          setSaving(false);
          setError(ctx.error.message ?? 'Could not save. Please try again.');
        },
      },
    );
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          asChild
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            // While editing, Esc cancels the edit only — don't let Radix dismiss
            // the whole sheet. Otherwise it closes as usual.
            if (editing) {
              event.preventDefault();
              setEditing(false);
            }
          }}
        >
          <Card
            // Same Card as the gate/login; positioned as a flush bottom sheet on
            // mobile, a centered card on sm+ (the gate gets this from its parent
            // scrim — here the Card positions itself).
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 w-full gap-4 rounded-b-none border-x-0 border-b-0 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
              'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-b-xl sm:border-x sm:border-b sm:pb-5',
              'duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95',
            )}
          >
            <div className="flex flex-col items-center gap-1.5 px-6 text-center">
              <span className="mb-1 flex size-24 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserRound className="size-14" />
              </span>

              {editing ? (
                <>
                  <DialogPrimitive.Title className="sr-only">
                    Edit your name
                  </DialogPrimitive.Title>
                  <div className="flex w-full max-w-xs items-center gap-2">
                    <Input
                      ref={inputRef}
                      autoFocus
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                      }}
                      maxLength={MAX}
                      placeholder="Your name"
                      aria-invalid={invalid && normalized.length > 0}
                      className="text-center"
                    />
                    <Button
                      size="icon"
                      aria-label="Save name"
                      disabled={invalid || unchanged || saving}
                      onClick={handleSave}
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Cancel"
                      disabled={saving}
                      onClick={() => setEditing(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex w-full min-w-0 justify-center">
                  {/* Inner block is only as wide as the name (the button is
                      absolute, so it adds no width) — centering this block
                      centers the name, and the pencil overhangs to its right. */}
                  <div className="relative flex min-w-0 max-w-full items-center">
                    <DialogPrimitive.Title asChild>
                      <CardTitle className="min-w-0 truncate text-lg">
                        {user.displayName}
                      </CardTitle>
                    </DialogPrimitive.Title>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Edit name"
                      className="absolute left-full top-1/2 ml-1 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Stable cross-service id, labelled and shown under the name. */}
              <span className="max-w-full truncate text-xs text-muted-foreground">
                <span className="font-medium">PublicID:</span> {user.publicId}
              </span>

              <span className="text-xs text-muted-foreground">
                Joined {joinedLabel(user.publicId)}
              </span>

              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Free
              </span>

              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="px-6">
              <div className="overflow-hidden rounded-xl border border-border">
                {/* Theme — whole row toggles; the Switch is a pointer-events-none
                    indicator with the live sun/moon riding the knob. */}
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={cn(ROW_BTN, 'border-b border-border')}
                >
                  <Palette className="size-4 text-primary" />
                  Theme
                  <Switch
                    checked={isDark}
                    className="pointer-events-none ml-auto"
                  >
                    {isDark ? (
                      <Moon className="size-3.5 text-slate-300" />
                    ) : (
                      <Sun className="size-3.5 text-primary" />
                    )}
                  </Switch>
                </button>

                {user.isAnonymous && (
                  <Link
                    href="/login?intent=claim"
                    className={cn(ROW_BTN, 'border-b border-border')}
                  >
                    <Fingerprint className="size-4 text-primary" />
                    Claim account
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className={cn(ROW_BTN, 'text-destructive')}
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </div>
            </div>
          </Card>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
