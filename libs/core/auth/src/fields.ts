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
  // User-editable public name. Born as a copy of publicId at creation (set by
  // databaseHooks.user.create.before), then renamable via updateUser. input:true
  // unlocks the built-in /update-user endpoint for it; the value is validated +
  // normalized (3-20 chars) in databaseHooks.user.update.before, since input:true
  // does no validation on its own. No DB change — input only gates the JS layer.
  displayName: {
    type: 'string' as const,
    required: true,
    input: true,
  },
  // 'male' | 'female'. Collected at the /chat gate and ridden in on the
  // signIn.anonymous body; set ONCE in databaseHooks.user.create.before —
  // exactly like publicId (required + input:false; the plugin doesn't provide
  // it, the hook does). input:false ⇒ immutable (updateUser can't change it,
  // no guard needed). required ⇒ NOT NULL, so a create without a gender (i.e.
  // not via the gate) hard-fails: "no account without gender" at the DB level.
  // Travels in the JWT (immutable; apps/api matchmaking needs it at connect).
  gender: {
    type: 'string' as const,
    required: true,
    input: false,
  },
};
