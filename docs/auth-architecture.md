# Auth & User Identity Architecture

Plan for Better Auth + anonymous users + cross-service identity in the chatarooni monorepo (apps/auth, apps/api, apps/web).

## Goals

1. Anonymous-by-default — visitors can chat without signing up; "no sign-up required" tagline holds true.
2. Signed-up users get persistence — chats saved, friends list, blocked users, reputation, etc.
3. Stable cross-service user identity — apps/api references survive any user-table churn (including anon → real account upgrades).
4. No event broker / message queue / cross-service DB joins. Plain HTTP + JWT.
5. Each service owns its own domain: apps/auth = identity, apps/api = chat/social.

## Decisions made

1. **Use Better Auth's `anonymous` plugin** (not stateless guests). Anon users are real Better Auth user records with `isAnonymous: true`. Lets apps/api stay on a single JWT verification path; gives returning anon visitors continuity.
2. **`publicId` is the canonical user identifier** seen by apps/api — not Better Auth's internal `id`. It's stable across the anon→real upgrade.
3. **`displayName` is the only user-facing name.** Real names from Google OAuth (`profile` scope kept) are stored in `user.name` for audit but never displayed.
4. **Email/password sign-up is disabled** (`disableSignUp: true`). All new accounts come from OAuth. Email/password is used only for login + password reset (which doubles as the "set initial password" flow for OAuth-only users once Resend is wired).
5. **Path B (anon logs in with existing credentials) discards anon data.** Intended behavior — rare, and merging cross-account anon state is more trouble than the UX is worth.

## User table — fields

Beyond Better Auth defaults:

| Field | Source | Type | Notes |
|---|---|---|---|
| `publicId` | `user.additionalFields` | string, unique, defaultValue = `uuidv7()` | Stable handle used by apps/api everywhere. Preserved across Path A upgrade via `onLinkAccount`. v7 for B-tree index performance. |
| `displayName` | `user.additionalFields` | string | Random "BraveOwl42" name. Generated for every new user via `databaseHooks.user.create.before` (anon AND direct signup). Copied forward in `onLinkAccount` Path A. |
| `isAnonymous` | added by `anonymous()` plugin | boolean | Distinguishes guest sessions from real accounts. Travels as JWT claim. |

Defaults Better Auth provides that we keep using:

| Field | Notes |
|---|---|
| `id` | Better Auth internal. **Changes** on anon → real link. apps/api never sees this. |
| `name` | Real name from Google OAuth (since `profile` scope kept). **Stored, never displayed.** Used only for audit / abuse evidence. |
| `image` | **Overridden** — populated by us with a custom random avatar URL (e.g., Dicebear seeded by `publicId`), NOT Google's `picture` URL. Set via the same `databaseHooks.user.create.before` that fills `displayName`. Stable across devices because the seed is the publicId. |
| `email` | Nullable (anon plugin allows). Populated on signup/OAuth. |
| `emailVerified`, `createdAt`, `updatedAt` | Standard. |

### Avatar generation pattern

Custom random avatars instead of OAuth profile pictures, for the same anonymity-by-default reason `displayName` overrides the real name. Two viable approaches:

- **External avatar service (recommended)**: `https://api.dicebear.com/9.x/{style}/svg?seed={publicId}` — free, no infra, well-cached at edge. Style options: `bottts`, `personas`, `shapes`, etc. (Pick one for chatarooni's vibe and stick with it.)
- **Self-generated SVG**: server-side function returning a procedural avatar (geometric gradients, identicon-style). More control, more code.

For Phase 1: external avatar service. Set `user.image = dicebear_url(publicId)` in the `databaseHooks.user.create.before`. Re-roll later by regenerating with a new seed if you add a "change avatar" feature.

## The two upgrade paths

When an anon user (signed in via `signIn.anonymous()`) initiates `signUp.email`, `signIn.email`, or `signIn.social`, Better Auth's `anonymous` plugin fires `onLinkAccount({ anonymousUser, newUser, ctx })`. Two distinct cases:

### Path A — Anon signs up with brand-new credentials

```
Anon (id=A, publicId=P1, displayName="BraveOwl42")
    ↓ signUp via OAuth (Google, brand-new email)
    ↓ Better Auth creates newUser (id=B, publicId=P2-auto-generated)
    ↓ onLinkAccount fires
    ↓ Detection: newUser.createdAt within last 60s → fresh signup
    ↓ updateUser: copy publicId (P1) and displayName from anon to newUser
    ↓ newUser becomes (id=B, publicId=P1, displayName="BraveOwl42")
    ↓ Better Auth deletes anon (id=A)
Result: apps/api data keyed by P1 is intact. User keeps their chats, friends, etc.
```

### Path B — Anon signs in to existing account (different device, returning user)

```
Anon (id=C, publicId=P3, displayName="QuietRiver89") on new device
    ↓ signIn via Google (already-existing account)
    ↓ newUser = the EXISTING user U1 (id=D, publicId=P4, days old)
    ↓ onLinkAccount fires
    ↓ Detection: newUser.createdAt is old → existing user
    ↓ Do nothing — leave U1's publicId/displayName alone
    ↓ Better Auth deletes anon (id=C)
Result: U1 logs in with their full history. Anon's brief activity (publicId=P3 in apps/api) is orphaned by design.
```

### Detection logic (draft — see "Risks under review" below)

```ts
onLinkAccount: async ({ anonymousUser, newUser, ctx }) => {
  const ageMs = Date.now() - new Date(newUser.createdAt).getTime();
  const isFreshSignup = ageMs < 60_000;

  if (isFreshSignup) {
    // Path A
    await auth.api.updateUser({
      headers: ctx.headers,
      body: {
        publicId: anonymousUser.publicId,
        displayName: anonymousUser.displayName,
      },
    });
  }
  // Path B: do nothing. Anon's apps/api rows become orphans (lazy cleanup).
}
```

## Risks under review (must resolve before implementation)

The detection logic above has known correctness issues. Each needs a decision or verification step before this plan is safe to implement.

### Bug 1 — Unique constraint violation on publicId copy (critical)

At the moment `onLinkAccount` fires:
- **anonymousUser** still exists in the DB with `publicId = P1`
- **newUser** has been freshly created with `publicId = P2` (from defaultValue generator)
- Better Auth deletes the anonymous user AFTER the callback returns (assumed — see Verification 1)

The Path A branch calls `updateUser` to set `newUser.publicId = P1`. But anonymousUser still holds P1 at that moment. With `unique: true` on the column, the UPDATE throws.

Two outcomes, both bad:
- If Better Auth rolls back on callback throw → user sees signup error.
- If Better Auth swallows the error → link completes, anon deleted, newUser keeps P2, all apps/api data keyed to P1 orphans. **Silent data loss.**

Mitigation options (pick one before implementing):

- **(a) Swap via temporary placeholder**: Update anon's publicId to a deterministic placeholder (e.g., `__pending_delete__<id>`) first, then update newUser to P1. Requires using `ctx.context.adapter.update` (lower-level than `auth.api.updateUser`).
- **(b) Separate `user_identity` table**: Move `publicId` out of the user table into its own table; the link operation REPOINTS the existing row (`UPDATE user_identity SET user_id = newUser.id WHERE public_id = anonymousUser.publicId`). No conflict, but adds a JOIN to every publicId→user resolution.
- **(c) Explicit delete-before-update**: Force anon deletion inside the callback before updating newUser. Depends on Better Auth allowing this.

### Bug 2 — 60-second threshold is dangerously generous (high)

Realistic scenario:
- T=0: User signs up via Google. newUser created with publicId=P.
- T=30s: Same person, different browser, gets anon session with publicId=Q. Chats briefly.
- T=55s: Tries to sign in with the just-created Google account.

In `onLinkAccount`: `newUser.createdAt` is 55s ago → `isFreshSignup = true` (false positive). Path A branch runs → newUser.publicId overwritten from P to Q. **All apps/api data created in the last 55s under P orphans, AND the user's stable identity is wrongly changed mid-session.**

Multi-device users will hit this. Not an edge case.

Mitigation: tighten the threshold. Better Auth's normal callback fires <1s after user creation. **1-second threshold** is safe for true Path A signups and effectively eliminates false positives.

### Bug 3 — Timestamp heuristic isn't deterministic (medium)

`createdAt` proximity is a proxy for "this user was created in this request." A deterministic signal would be safer:

Candidates to investigate (Verification 3):
- `ctx.context.isNewUser` or similar flag, if exposed by Better Auth.
- `newUser.updatedAt === newUser.createdAt` — fresh user → fields equal. But the link operation may bump updatedAt, breaking this.
- Query the `account` table — fresh signup → only this request's account row exists.

If no deterministic signal is available, the 1-second timestamp heuristic is the practical fallback. But it remains a heuristic.

### Bug 4 — Direct (non-anon-originated) signups never hit onLinkAccount, so displayName stays NULL (medium)

If a user lands on chatarooni for the first time and immediately clicks Sign in → Google (without first engaging with chat anonymously), `onLinkAccount` does NOT fire (no anon user to link). newUser is created with:
- auto-generated `publicId` ✅
- `name` from Google's profile ✅
- `displayName` = **NULL** ❌ — `anonymous().generateName` only runs for anon user creation, not direct signups

Then AccountMenu has no displayName to show. Fallback could leak the real Google name into the UI — which violates the "never display real name" architectural principle.

Mitigation: use `databaseHooks.user.create.before` to populate `displayName` on EVERY user create (anon or direct):

```ts
databaseHooks: {
  user: {
    create: {
      before: async (user) => ({
        data: {
          ...user,
          displayName: user.displayName ?? randomDisplayName(),
        },
      }),
    },
  },
}
```

This makes `anonymous().generateName` redundant (it can be dropped). Single source of truth for displayName assignment.

## Verification items (need Better Auth source / test deploy to confirm)

Each of these is an unverified assumption in the current plan. Must verify before implementation.

1. **Callback ordering**: Does Better Auth delete the anonymous user BEFORE the callback runs, AFTER it, or transactionally with the link operation? Bug 1 depends on this.
2. **Error handling in `onLinkAccount`**: If the callback throws, does Better Auth roll back the link, swallow the error and continue, or propagate it to the client? Bugs 1 and 2 manifest differently based on this.
3. **`ctx` content**: Does the callback's `ctx` expose any flag indicating "this is a brand-new user"? If yes, replace the timestamp heuristic.
4. **`auth.api.updateUser` targeting**: Does it always update the session's user, or can it target a specific user by ID? Determines whether we can safely modify newUser from within the callback if the session isn't yet swapped.

## Reconsideration: stateless guests vs anon plugin

The four bugs above + four verification items expose a real complexity cost in the anon-plugin approach. Comparing the two architectures with these costs in view:

| Approach | Where complexity lives | Long-term |
|---|---|---|
| **Anonymous plugin + publicId stability** | Concentrated in apps/auth (onLinkAccount + databaseHooks + verification + tested edge cases). One-time cost, hidden in auth layer. | apps/api stays simple — one JWT verify path. |
| **Stateless guests** (apps/api issues guest JWTs, no DB row for anons) | Distributed across apps/api (two JWT verify paths + guest token issuance + cookie management). Recurring cost — every new endpoint branches on guest vs real. | No onLinkAccount, no publicId conflicts, no orphan cleanup, no Better Auth source diving. |

The anon plugin pays off long-term IF the verification work is done thoroughly. The stateless approach avoids the entire class of bugs above at the cost of slightly more code in apps/api.

**Decision pending.** Choose between:
- **(A) Commit to anon plugin**: do the verification work, fix all 4 bugs, then implement Phase 1.
- **(B) Switch to stateless**: rewrite this doc to reflect stateless architecture; apps/api accepts both Better Auth JWTs (real users) and self-issued guest JWTs.

Both are defensible. Time investment differs significantly.

## JWT claims

Better Auth's `jwt()` plugin's `definePayload`:

```ts
definePayload: ({ user }) => ({
  publicId: user.publicId,         // stable identity for apps/api
  isAnonymous: user.isAnonymous,   // boolean — endpoint authorization branching
  displayName: user.displayName,   // performance: avoid per-request lookup
  image: user.image,               // avatar URL — avoid per-request lookup
  role: user.role,                 // permission level (separate concern from account type)
}),
```

apps/api reads `publicId` from claims and uses it as the user identifier in all queries. Never queries apps/auth's DB. Verifies JWT via JWKS (existing `libs/core/auth`).

### Why each claim is here (and why others aren't)

- **`publicId`** — apps/api's identity key. Required.
- **`isAnonymous`** — kept SEPARATE from `role`. They're orthogonal: `role` = "what permissions does this user have?" (`user`/`admin`/future `moderator`/`banned`); `isAnonymous` = "what kind of account is this?" (anon session vs real account). These vary independently — an anon user can be banned (role=banned, isAnonymous=true); a real user can be a moderator (role=moderator, isAnonymous=false). Collapsing them into one field forces a Cartesian product of values. Also, Better Auth's admin plugin sets `role='user'` by default on every user create (anon included), so encoding "anon" as `role=null` would mean fighting the plugin with custom hooks. Boolean stays explicit and self-documenting.
- **`displayName`** — included for performance: every chat message Alice sends to Bob needs Alice's displayName in the payload. Looking it up per-request would mean either a DB hit per message (hot path) or a custom connection-time handshake (more protocol). JWT claim is the cleanest pattern. **Caveat**: displayName in JWT is slightly stale on rename — Alice's active JWT carries the old name until refresh. Acceptable for chat (eventual consistency, small UX lag). Force JWT refresh on rename if instant propagation is ever required.
- **`image`** — **custom random avatar URL** (NOT Google's profile picture). Generated server-side at user creation, seeded by publicId for stability across devices. Same reasoning as displayName: included in JWT to avoid a per-request lookup when rendering avatars in chat / friend lists / message bubbles. Same staleness caveat applies — JWT carries the URL at time of issue; if the user re-rolls or uploads a custom avatar, the new URL propagates on next JWT refresh.
- **`role`** — existing in current config (set by admin plugin). Used for permission checks.

### Claims deliberately NOT in the JWT

- **`email`** — apps/api never needs email for business logic (chat, friends, blocks, reports all key off publicId). Including it would: (1) bloat the token, (2) leak PII into logs/traces where JWTs commonly appear, (3) widen the blast radius if a JWT leaks. If apps/api ever needs email for moderation, it can call apps/auth's `getUser` endpoint with the publicId. Pay the lookup cost in the rare case, not on every request.
- **`name`** (real name from OAuth) — never displayed; only used for audit/abuse evidence. apps/api doesn't need it.

## apps/api implications

### Tables (Phase 2)

All references use `publicId` (TEXT), not Better Auth's internal `id`:

- `chat_session(id, user_a_public_id, user_b_public_id, started_at, ended_at)`
- `chat_message(id, session_id, sender_public_id, text, created_at)` *(if persisted)*
- `friends(user_a, user_b, created_at)` — canonical ordering, `user_a < user_b`
- `friend_requests(requester_id, recipient_id, status, created_at)`
- `blocks(blocker_id, blocked_id, created_at)`
- `reports(id, reporter_id, reported_id, reason, content_snippet, created_at, status)`

### Authorization

Single JWT verify path. Most endpoints are open to BOTH anon and real users — `isAnonymous` only gates a small set of identity/account-management actions that don't make sense without an email.

**Open to both anon and real users:**
- `/chat/start`, `/chat/skip`, `/chat/report`
- `/friends/*` (add, remove, list) — anons can friend each other or real users
- `/blocks/*` (block, unblock, list)
- `/reports/*`
- `/me/rename` (change displayName), `/me/avatar` (re-roll avatar)

**Anon-only (would error for real users)**: none. Real users can do everything anons can.

**Real-only (gated by `isAnonymous` check)**: identity / email-bound actions.

```ts
@Post('/chat/start')
startChat(@Req() req) {
  // Anon AND real — both can chat.
  return this.chatService.startSession(req.user.publicId);
}

@Get('/friends')
listFriends(@Req() req) {
  // Anon AND real — both can have friends. Friends are publicId pairs;
  // upgrades preserve the relationship via Path A.
  return this.friendsService.list(req.user.publicId);
}

@Post('/account/change-email')
changeEmail(@Req() req) {
  // Real ONLY — anon has no email to change.
  if (req.user.isAnonymous) {
    throw new ForbiddenException('Sign up to manage your email');
  }
  return this.accountService.changeEmail(req.user.publicId);
}

@Post('/account/export-data')
exportData(@Req() req) {
  // Real ONLY — GDPR-style data export tied to a recoverable identity.
  if (req.user.isAnonymous) {
    throw new ForbiddenException('Sign up to export your data');
  }
  return this.accountService.export(req.user.publicId);
}
```

`isAnonymous` is more useful for:
- **Rate limiting** (e.g., anon: 20 chats/hour, real: 200/hour)
- **Retention policy** (e.g., anon chat history kept 30 days, real kept indefinitely)
- **UI affordances** (AccountMenu shows "Save your account" CTA, chat UI shows "Sign up to keep this conversation" nudges)

These are usually middleware / service-level concerns, not endpoint-level branching.

### Orphan cleanup

After Path B (or after anon idle-cleanup cron deletes a stale anon user), apps/api has rows keyed by publicIds that no longer exist in apps/auth.

**Lazy cleanup**: ignore. The user who owns those rows can never authenticate as that publicId again (JWT won't carry it). Orphans sit harmlessly.

**Optional proactive cleanup** (Phase 3): cron that queries apps/auth for live publicIds and deletes apps/api rows not in the set. Only needed if storage becomes an issue.

**Cross-user reference cleanup** (Phase 2 concern): when User A's friend B becomes an orphan, A's friends list returns broken entries. Mitigation: on query, JOIN against apps/auth's user table (HTTP API call or shared DB) to filter out unresolvable publicIds. Or run periodic cleanup to delete dead friend rows.

## apps/web implications

### Anonymous session bootstrap

- Lazy: only call `signIn.anonymous()` when user attempts to chat (not on home page load). Marketing visitors don't get DB rows.
- Auto: when triggered, no confirmation modal. UI says "Starting your chat..." not "Creating an account...".

### Login form

- Drop sign-up mode toggle (signup is OAuth-only via `disableSignUp: true`).
- Keep "Sign in" + "Continue with Google".
- Add "Forgot password?" link → `/forgot-password` page that calls `requestPasswordReset`. Blocked until backend Resend wired.

### AccountMenu adapts to user type

- **Anon**: show displayName, primary CTA "Save your account" → /login (with OAuth options).
- **Real**: show displayName, "Sign out" item, future settings entries.

### Rename UI

- Lives in `/chat` settings (not in AccountMenu, per UX choice).
- Calls `authClient.updateUser({ displayName: newName })`.
- Real users only. Anon users rename by clearing cookies (effectively).

## Cleanup cron

```sql
-- apps/auth, run nightly
DELETE FROM "user"
WHERE "isAnonymous" = true
  AND "updatedAt" < NOW() - INTERVAL '30 days';
```

30-day window matches typical "returning user" intent. Adjustable.

## Implementation phases

### Phase 1A — apps/auth foundation

1. Add `publicId` additionalField (UUID, unique, default generator).
2. Add `displayName` additionalField.
3. Random name generator (~200 adjectives × ~200 nouns + 2-digit number).
4. Add `anonymous` plugin with `generateName` + `onLinkAccount`.
5. Update `jwt` plugin's `definePayload` to include `publicId`, `isAnonymous`, `displayName`.
6. DB migration: add columns, indexes (`publicId` unique).
7. Cleanup cron (or scheduled function) for stale anon users.

### Phase 1B — apps/web wiring

8. Add `anonymousClient` plugin to authClient.
9. Lazy `signIn.anonymous()` on first chat-engagement click.
10. Remove Name field + sign-up mode from login form.
11. AccountMenu: display `displayName`, adapt CTAs by `isAnonymous`.

### Phase 1C — Verify

12. Path A smoke test: anon signs up via Google → publicId preserved → no data loss.
13. Path B smoke test: anon logs in with existing account → existing user untouched → no errors.

### Phase 2 — apps/api chat domain

14. Tables: chat_session, friends, blocks, reports — all keyed by publicId.
15. Auth middleware reads `publicId`, `isAnonymous`, `displayName` from JWT.
16. Endpoint authorization branches on `isAnonymous`.
17. WebSocket text chat (server-relayed for moderation).
18. WebRTC signaling (for future video).
19. Cross-user reference cleanup for orphaned publicIds in friends/blocks.

### Phase 3 — Polish & operations

20. Proactive orphan cleanup cron in apps/api (optional).
21. Bot mitigation: Cloudflare Turnstile on `signIn.anonymous()` if abuse detected.
22. Monitoring: anon-to-signup conversion, abuse signals, table growth.

## Open questions

1. **`signIn.anonymous()` trigger** — eager (on page load) vs lazy (on first chat click)?
   - **Picked: lazy.** Don't create DB rows for marketing visitors.

2. **Anon → chat: button or auto-call?**
   - **Picked: auto-call.** Frictionless. UI hides the auth detail.

3. **Cleanup window** — 7 / 30 / 90 days?
   - **Picked: 30 days.** Industry standard.

4. **Chat content persistence for anon** — truly ephemeral or 24h moderation hold?
   - *Open.* Lean toward 24h hold for abuse-handling capability.

5. **Real user chat history default** — opt-in (save chats you want) or opt-out (saved by default, delete in settings)?
   - *Open.* Lean toward opt-out — standard for messengers, simpler UX.

## Why not other approaches

### Why not stateless guests (no DB row for anons)?
- Would force apps/api to have **two auth paths** (Better Auth JWTs for real users + apps/api-issued JWTs for guests). Adds significant code surface.
- Anon users would have zero persistence — no friends, no per-session chat history. Less engaging "try before you commit" experience.
- Anon plugin is canonical Better Auth pattern — less custom code to maintain.

### Why not put profile data in a separate user-service DB?
- Premature microservicization. Profile = `displayName` and maybe later `image`, `preferences`. Not a service's worth of domain logic.
- apps/auth IS the user identity service. `additionalFields` exists for exactly this case.
- Reversible later: extract profile to its own service if it grows.

### Why not use Better Auth's `id` directly in apps/api?
- `id` changes on Path A upgrade (Better Auth deletes anon, creates new). All FKs would break.
- `publicId` is the indirection layer that decouples internal identity churn from external references.

### Why discard anon data on Path B instead of merging?
- Merge logic requires cascade migration across all tables in apps/api — perpetual maintenance burden as schema grows.
- Path B is uncommon (most upgrades are Path A).
- The lost data (a few minutes of anon chat on a new device) is low-value.
- Lost data = expected behavior when "logging into an existing account" — user knows they had an account, intends to resume that identity.

## Related docs

- `README.md` — TODOs reference this plan
- Better Auth anonymous plugin: <https://better-auth.com/docs/plugins/anonymous>
- Better Auth additional fields: <https://better-auth.com/docs/concepts/database#extending-core-schema>
