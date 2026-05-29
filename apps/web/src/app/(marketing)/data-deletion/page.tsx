import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion',
  alternates: { canonical: '/data-deletion' },
  robots: { index: false, follow: true },
};

export default function DataDeletionPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        Data Deletion
      </h1>
      <p className="mt-6 max-w-prose text-balance text-lg text-foreground/80">
        Our data deletion instructions are being drafted and will be published
        before public launch.
      </p>
    </main>
  );
}
