// Next.js auto-detects this file and calls register() once at server boot.
// Delegates to @chatarooni/logger/instrumentation so apps/web shares the
// same OTel SDK + auto-instrumentations as apps/api and apps/auth.
// The NEXT_RUNTIME guard skips Edge — auto-instrumentations-node patches
// Node's http/https and won't load in the Edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@chatarooni/logger/instrumentation');
  }
}
