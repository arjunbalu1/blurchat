'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Mode = 'sign-in' | 'sign-up';

// Official Google "G" mark — used on every "Continue with Google" button
// across the web. Inline SVG so there's no extra request and the colors
// stay true regardless of theme.
function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';

  const onAuthSuccess = () => {
    router.push('/');
    router.refresh();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // `ctx` is typed from authClient's signature via inference — no manual
    // annotation needed.
    if (isSignUp) {
      await authClient.signUp.email(
        { name, email, password },
        {
          onError: (ctx) =>
            setError(ctx.error.message ?? 'Something went wrong.'),
          onSuccess: onAuthSuccess,
        }
      );
    } else {
      await authClient.signIn.email(
        { email, password },
        {
          onError: (ctx) =>
            setError(ctx.error.message ?? 'Something went wrong.'),
          onSuccess: onAuthSuccess,
        }
      );
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    await authClient.signIn.social(
      {
        provider: 'google',
        callbackURL: `${window.location.origin}/`,
      },
      {
        onError: (ctx) =>
          setError(ctx.error.message ?? 'Google sign-in failed.'),
      }
    );
    // No setLoading(false) on success — page is redirecting to Google.
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </CardTitle>
        <CardDescription>
          {isSignUp
            ? 'Save chats and find friends faster.'
            : 'Sign in to continue. You can also start chatting without an account.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSubmit}>
          <FieldGroup>
            {isSignUp && (
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </Field>
            {error && (
              <p
                className="text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {error}
              </p>
            )}
            <Field>
              <Button type="submit" disabled={loading}>
                {loading
                  ? isSignUp
                    ? 'Creating account…'
                    : 'Signing in…'
                  : isSignUp
                    ? 'Create account'
                    : 'Sign in'}
              </Button>
              <FieldSeparator>OR</FieldSeparator>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={loading}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <FieldDescription className="text-center">
                {isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('sign-in');
                        setError(null);
                      }}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('sign-up');
                        setError(null);
                      }}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
