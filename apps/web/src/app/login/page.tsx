import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-var(--header-h))] max-w-md flex-col items-center justify-center px-4 sm:px-6">
      <LoginForm />
    </main>
  );
}
