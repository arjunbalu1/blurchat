# TODO

## Cloudflare: cache the static frontend (deferred)

**Status:** deferred — revisit once the frontend stops changing often (ideally after it has a build step with hashed/versioned asset filenames).

**Why:** Cloudflare doesn't cache HTML by default, so the apex `index.html` is fetched from Railway on every visit. Caching serves it from the CF edge → faster loads + less Railway load (relevant on the Trial plan).

**How:** Caching → Cache Rules → Create rule
- Match: `Hostname equals chatarooni.com`
- Then: "Eligible for cache" + set an Edge TTL

**Caveat:** cached HTML won't reflect edits until the TTL expires or you purge the cache. While still iterating on the frontend, either keep this off, or use a short Edge TTL (~5 min). Long-term: cache the HTML shell briefly + serve hashed asset filenames cached aggressively.

## Cloudflare: CSAM Scanning Tool (deferred — once media uploads exist)

**Status:** deferred until users can upload/share images (no media feature yet).

**What:** Cloudflare's free CSAM Scanning Tool scans images served through Cloudflare against NCMEC's known-CSAM hash lists, flags matches, and supports reporting to NCMEC.

**Why:** chatarooni is a chat app — once it handles user-uploaded images, detecting and reporting CSAM is a legal (US providers must report to NCMEC) and ethical obligation. Core trust & safety.

**Prereqs:** image upload/sharing built, and media served/cached **through Cloudflare** (the tool scans content passing through CF).

**How:** Cloudflare dashboard → enable the CSAM Scanning Tool for the zone → configure NCMEC reporting details.

**Note:** known-hash scanning is table-stakes; a real UGC platform also needs broader moderation (unknown/new CSAM detection, user reporting flows, takedown process).
