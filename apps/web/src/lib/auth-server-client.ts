import 'server-only';
import { createAuthClient } from 'better-auth/client';

// Server-only auth client — uses better-auth/client (no React/nano-stores)
// since this never runs in the browser. The /react export is reserved for
// client components (see auth-client.ts).
//
// Prefer the Railway private network over the public URL: sub-10ms vs ~50ms
// through Cloudflare/public DNS, and zero egress bandwidth. Falls back to the
// public URL in dev or when AUTH_INTERNAL_URL isn't configured.
const baseURL =
  process.env.AUTH_INTERNAL_URL ?? process.env.NEXT_PUBLIC_AUTH_URL;

export const authServerClient = createAuthClient({ baseURL });
