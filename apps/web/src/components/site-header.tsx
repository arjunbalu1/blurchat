import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { UserMenu } from '@/components/user-menu';
import { getSession } from '@/lib/auth-session';

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 w-full select-none border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-(--header-h) max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
        >
          <Image
            src="/logo.png"
            alt=""
            width={64}
            height={64}
            className="size-10 sm:size-12 md:size-16"
            priority
          />
          <span>
            Chatarooni<span className="font-normal text-primary">.com</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {session?.user ? (
            <UserMenu user={session.user} />
          ) : (
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
