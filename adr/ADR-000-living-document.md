# ADR-000: Living document (backlog & sketchpad)

## Status

**Living.** Unlike every other file in `adr/`, this one is never
"accepted," "superseded," or frozen — it's meant to be edited constantly,
by whichever session or dev is in the driver's seat at the time. Read it
at the start of a session to pick up where things left off; update it
before ending one so the next session doesn't have to re-derive context
that only existed in a chat transcript.

## Purpose

Real ADRs (ADR-001 and up) each record one decision, made at one point in
time, and are expected to stay mostly still after that. But a lot of the
useful stuff that happens in conversation is smaller than a decision: a
half-formed idea worth not losing, a to-do that only makes sense once
something else lands, a question that's still open. This file is where
that lives — a running backlog and sketchpad, not a decision record.

## How to use this file

- **Starting a session:** read the "Current context" and "To-dos"
  sections below before doing anything else.
- **Ending a session, or after sketching something in conversation:**
  add/update to-dos and sketches here so the next session (possibly a
  different dev, possibly Claude with no memory of this conversation)
  has it.
- **When a to-do is done:** check it off, and if it's worth remembering
  *that* it happened, move it to the Log with a date. Otherwise just
  delete it.
- **When a sketch matures into an actual decision:** promote it to a new
  `ADR-NNN-*.md`, then reference it briefly here (in "To-dos" or
  "Current context") while its implementation is still in progress.
  **Once that implementation work is actually complete — not just
  decided/accepted — remove the reference from this file entirely** and,
  if worth remembering that it happened, log it instead. The ADR itself
  stays put as permanent history; this file only tracks what's still
  live.

## Current context snapshot

- **Role in the overall setup:** central backend — db/server combo that
  other repos (starting with `on-the-go`) are meant to connect to.
  main-frame also serves its own display/dashboard for the data it holds.
  See the top-level `~/Projects/CLAUDE.md` for how the repos relate.
- **Stack:** Next.js (App Router) + Postgres (Neon, via the Vercel
  Marketplace integration) + NextAuth, deployed on Vercel.
- **Staging/production pipeline:** decided and implemented — see ADR-001.
  Neon `main`/`preview` branches, Vercel Production Branch repointed to a
  dummy `production` branch so `master` deploys as staging, migrations
  run via `node-pg-migrate` in two GitHub Actions workflows. Nothing
  outstanding here right now.
- **Auth:** wired up. A `users` table (username, `password_hash`,
  `display_name` — two accounts only, no self-signup; real credentials
  created via `npm run create-user` against a real `DATABASE_URL`,
  never committed) backs two separate mechanisms: NextAuth's Credentials
  provider (`src/lib/auth.ts`, session strategy `jwt`) for a future web
  login, and a bearer-token login for the mobile app
  (`src/lib/mobileAuth.ts` + `POST /api/mobile/login`, since a bare
  React Native client doesn't suit NextAuth's cookie-based session).
  Both share `src/lib/credentials.ts`'s `verifyCredentials()`.
  `requireMobileAuth()` exists for other routes to adopt — the
  `decks`/`recordings` routes below don't check it yet (see To-dos).
- **Database access:** `src/lib/db.ts` has a pooled `pg` client wired to
  `DATABASE_URL`, reused across hot reloads/invocations. ADR-002's
  schema (`decks`/`decks_cards`/`decks_attempts`/`word_recordings`) is
  implemented and pushed, alongside the `users` table above. Two decks
  now seeded: a 100-word Swedish/Lithuanian placeholder (the first
  migration's dummy content), and the real 237-word *Žuikis Puikus*
  vocabulary (see Log) — `language_eng` is nullable and `decks_cards`
  has a `page_nr` column to accommodate the latter, which has no English
  gloss.
- **API surface:** real routes exist — `GET /api/decks/:deckId/cards`,
  `POST /api/recordings`, `POST /api/recordings/batch`,
  `POST /api/mobile/login`, plus NextAuth's route. None of the
  decks/recordings routes are auth-gated yet (see To-dos). `on-the-go`
  now calls this API instead of local dummy data — but see the new
  Vercel deployment-protection to-do below before assuming a phone can
  actually reach it.

## To-dos (backlog)

- [ ] Gate the `decks`/`recordings` routes behind `requireMobileAuth()`
      (it exists, ready to adopt — see "Auth" above) — they're
      unauthenticated right now, which was an explicit, acknowledged gap
      in ADR-002 written *before* auth existed at all. Worth revisiting
      now that it does.
- [ ] Revisit `decks_attempts.actor` (ADR-002) now that a real `users`
      table exists — it's currently nullable free text specifically
      because no users table existed yet when that decision was made.
      Not urgent, but the original reason for that shape is gone.
- [ ] Replace the default `create-next-app` `page.tsx` with the actual
      dashboard/display this repo is meant to provide.
- [x] ~~Decide how on-the-go is actually supposed to reach this API~~ —
      decided: a Protection Bypass for Automation secret, sent as
      `x-vercel-protection-bypass`, rather than disabling `ssoProtection`
      project-wide or waiting on a custom domain. on-the-go sends it via
      `EXPO_PUBLIC_VERCEL_BYPASS_SECRET` (see its `lib/learningApi.ts`).
      Worth knowing: that value is now visible in this project's own
      session history and baked into a published on-the-go update, so
      it's not meaningfully secret anymore — regenerate it from Vercel's
      project settings if that's a problem; nothing app-level depends on
      the specific value.
- [ ] **on-the-go's Server URL still isn't actually set to anything.**
      `readSettings().serverUrl ?? ''` has no default or hardcoded
      fallback anywhere — whether the app can reach main-frame at all
      depends entirely on a string manually typed into Settings on the
      physical phone, which nothing in this repo's work today touched.
      Production's stable URL (confirmed live, not a per-deployment one
      that changes every push): `https://main-frame-chansencodes-projects.vercel.app`.
- [x] ~~Load staging's data onto production, promote staging to
      production~~ — done 2026-08-28, see Log. Production now has both
      decks; the `promote-to-production.yml` workflow ran clean.

## Sketches / ideas in progress

_Half-formed stuff, not yet decision-ready. Promote to a numbered ADR
once it firms up._

- (nothing yet)

## Log

- 2026-08-27: File created; `adr/` folder introduced (previously
  ADR-0001 lived loose at the repo root as
  `ADR-0001-staging-production-pipeline.md`). Moved into `adr/` and
  renumbered to ADR-001 for consistency with `on-the-go`'s convention.
- 2026-08-27: ADR-001 (staging/production pipeline) accepted and
  implemented — Neon branching, Vercel branch-driven environments,
  `node-pg-migrate`, two GitHub Actions workflows. No outstanding
  reference kept here since the implementation is done; see ADR-001 for
  the full record.
- 2026-08-28: Wrote a first-pass schema migration:
  `migrations/1787904305663_create-cards-table-and-seed-flashcards.js`,
  a `card_groups` / `cards` pair modeling on-the-go's `Card` type
  (`data/flashcards.ts`, branch `claude/android-app-chat-dev-6ce6lt`),
  seeded with that branch's 100 Swedish/Lithuanian dummy pairs. Verified
  `up`/`down`/re-`up` against a disposable local Postgres container, then
  committed (not pushed).
- 2026-08-28: Superseded the above same-day, before it was ever pushed —
  ADR-002 accepted: renames the tables to `decks`/`decks_cards`/
  `decks_attempts` (hierarchical naming), renames `decks_cards.name` to
  `language_eng`, drops the `times_completed`/`last_completed` columns in
  favor of a `decks_attempts` ledger (records direction and
  correct/incorrect per review, including failures), and adds a fourth
  `word_recordings` table for per-word audio, loosely joined by
  lower-cased word text rather than a foreign key. See ADR-002 for the
  full design and reasoning. The committed migration doesn't reflect this
  yet — see To-dos.
- 2026-08-28: Settled two open points in ADR-002, same day: dropped
  `word_recordings.language` entirely (match by word text alone, no
  canonical language-code column added to `decks` — accepted the small
  cross-language-collision risk instead), and decided audio storage —
  raw AAC bytes in a `word_recordings.audio_data bytea` column, not an
  external URL. Checked real numbers before deciding the latter: Neon's
  free tier is 0.5 GB shared across the `main`/`preview` branches (not
  0.5 GB each), and a 20% share of that comfortably fits 2,000+
  three-second AAC recordings — no CDN/object storage needed at this
  scale. Added three concrete requirements for the (still unbuilt)
  upload route: server-side lower-casing, verifying the audio actually
  decodes as AAC, rejecting anything over 10 seconds.
- 2026-08-28: Resolved ADR-002's read-path question from the client
  side in: on-the-go decided to cache recordings to local device storage
  (mirroring its Poems tab's existing `expo-file-system` approach) and
  play back from disk, not the network. That replaced the earlier
  streaming-vs-inline-data-URI framing entirely with two endpoints — a
  metadata-only card list the client diffs locally against, and a batch
  endpoint returning audio for just the specific words it's missing or
  has stale copies of. Also settled: re-recording a word upserts
  (`ON CONFLICT (word) DO UPDATE`) rather than rejecting or duplicating,
  since the client's staleness check depends on `recorded_at` changing
  on re-record. See ADR-002 and on-the-go's
  `adr/ADR-001-word-recordings.md`.
- 2026-08-28: Reworked the migration to match ADR-002 and built the
  three routes it specifies (`GET /api/decks/:deckId/cards`,
  `POST /api/recordings/batch`, `POST /api/recordings`), each verified
  against a real Postgres — including a real bug caught and fixed
  (`decks_attempts`'s bare `"bigserial"` shorthand didn't imply
  `PRIMARY KEY`) and a real AAC file exercising the upload route's
  validation. Pushing this hit a real divergence: `ed035c5` ("Add users
  table + credential verification + mobile login") had landed on
  `origin/master` from elsewhere in the meantime — real, wanted, working
  auth (NextAuth Credentials + a mobile bearer-token login), not a
  conflicting decision. Merged rather than overwritten: resolved a
  `package.json`/`package-lock.json` conflict (both branches added a
  dependency), then verified the combined result — both migrations
  running together, a real `next build` succeeding with every route from
  both branches listed — before pushing the merge. See To-dos for what
  this unblocks and what it leaves open (route auth, `actor`'s shape).
- 2026-08-28: Corrected a wrong assumption from the very first migration.
  "The zuikus puikus data" was assumed to mean the generic 100-word
  Swedish/Lithuanian placeholder deck already sitting in on-the-go's
  dummy data — it didn't. A real, page-by-page vocabulary extraction
  from the actual Lithuanian children's book *Žuikis Puikus* (title
  character's name — "zuikis" = hare, "puikus" = fine, both of which
  appear in the word list itself) was sitting the whole time on a
  completely orphaned on-the-go branch, `zuikus-puikus`, which had never
  been fetched locally. On-the-go's own ADR-000 (ported over during the
  branch reconciliation, see its Log) already had an explicit to-do to
  wire this in "once main-frame has a real database" — this migration is
  that to-do, done: `1787938199260_add-page-nr-and-seed-zuikis-puikus-deck.js`
  adds the 237 real words as a second deck (kept alongside the
  placeholder rather than replacing it, since that's already live), and
  the two schema changes it needed (`language_eng` nullable, new
  `page_nr` column) — verified `up`/`down`/`up` and a real query for both
  decks' row counts before pushing.
- 2026-08-28: Trying to actually verify a phone could reach any of this
  surfaced a separate, unrelated blocker: this project's
  `ssoProtection` is `all_except_custom_domains` (confirmed via
  `vercel api`, not guessed) — every deployment URL, staging or
  production, redirects to Vercel's own SSO login for anyone outside the
  team account. Not yet decided how to resolve it — see To-dos.
- 2026-08-28: Resolved the SSO-wall blocker above: generated a
  Protection Bypass for Automation secret (via `vercel curl`, which
  auto-provisions one) and wired it into on-the-go instead of disabling
  protection project-wide. Then promoted to production for the first
  time: ran `promote-to-production.yml` against
  `main-frame-5a3rj2a0w-chansencodes-projects.vercel.app` (the verified
  staging build including today's Žuikis Puikus migration) — production
  database migrated clean, `vercel promote` succeeded, and a live query
  against `https://main-frame-chansencodes-projects.vercel.app`
  confirmed both decks' real data on production afterward, not just a
  green workflow run. Surfaced in the process: on-the-go's Server URL
  has never actually been set to anything (see To-dos) — none of this is
  reachable from the phone yet regardless of environment.
