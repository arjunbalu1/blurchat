// Single source of truth for apps/auth's user.additionalFields. Consumed by:
//   - apps/auth (drives the actual DB schema + database hooks)
//   - apps/web's auth-client.ts (so React session.user is typed)
//   - apps/web's auth-server-client.ts (so server getSession is typed)
// Adding a new additional field = edit this file only.
//
// Lives as a subpath of @chatarooni/auth (rather than its own lib) since the
// existing auth lib is the natural home for auth-related shared concerns.
// The lib's index.ts pulls in NestJS — this subpath does NOT, so non-Nest
// consumers (apps/web client, Better Auth migrate CLI) can import it safely.
//
// NOTE: apps/auth imports this via a RELATIVE path (not @chatarooni/auth/fields)
// because the Better Auth migrate CLI uses jiti, which doesn't honor workspace
// path aliases.
export const userAdditionalFields = {
  publicId: {
    type: 'string' as const,
    required: true,
    unique: true,
    input: false,
  },
  displayName: {
    type: 'string' as const,
    required: true,
    input: false,
  },
};
