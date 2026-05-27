import 'server-only';
import { createAuthClient } from 'better-auth/client';

// Server-only auth client — uses better-auth/client (no React/nano-stores)
// since this never runs in the browser. The /react export is reserved for
// client components (see auth-client.ts).
export const authServerClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
});
