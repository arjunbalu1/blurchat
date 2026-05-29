import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center px-6 text-center">
      <Image
        src="/mascots/azure-404.png"
        alt=""
        width={1402}
        height={1122}
        priority
        className="w-[clamp(180px,40vw,320px)] select-none"
      />
      <p className="mt-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
        404
      </p>
      <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        Page not <span className="text-primary">found</span>
      </h1>
      <p className="mt-4 max-w-md text-balance text-foreground/80">
        Let&apos;s get you back home.
      </p>
      <Button asChild size="xl" className="mt-8 font-semibold">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
