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
- **Auth:** scaffolded, not wired up. `src/lib/auth.ts` has a NextAuth
  config with an empty `providers: []` — no provider (Credentials,
  GitHub, Google, etc.) has been chosen yet. `src/app/api/auth/[...nextauth]/route.ts`
  exists and will pick up whatever gets added there.
- **Database access:** `src/lib/db.ts` has a pooled `pg` client wired to
  `DATABASE_URL`, reused across hot reloads/invocations. Schema is
  decided (ADR-002: `decks`/`decks_cards`/`decks_attempts`/
  `word_recordings`, for on-the-go's Learning app) but not yet
  implemented as a migration — see To-dos.
- **API surface:** none yet. `src/app/page.tsx` is still the unmodified
  `create-next-app` scaffold page. This is the main blocker for
  `on-the-go` (and anything else) integrating against this repo.

## To-dos (backlog)

- [ ] Decide on an auth model/provider for NextAuth and wire up
      `src/lib/auth.ts` (currently `providers: []`).
- [ ] **Rework the locally-committed schema migration** (currently a
      `card_groups`/`cards` pair, no `decks_attempts` or
      `word_recordings`, no `language_eng` rename) to match ADR-002, then
      commit and push it so ADR-001's staging-deploy workflow actually
      applies it to the staging db. Nothing's been pushed yet, so this is
      a rewrite-in-place, not a follow-up migration.
- [ ] Define and build the first real API route(s) so `on-the-go` (and
      any other client) has something to point at — once ADR-002's
      tables exist for real, this is the next real blocker for
      `on-the-go`.
- [ ] Build the write path for `word_recordings` (upload endpoint) —
      ADR-002 designs the table (`bytea` storage, decided) and specifies
      four requirements the route must enforce (lower-case the word
      server-side, verify the audio actually decodes as AAC, reject
      anything over 10s, upsert on `word` rather than reject/duplicate),
      but the endpoint itself doesn't exist yet.
- [ ] Build the two read-path endpoints ADR-002 settled on:
      `GET /api/decks/:deckId/cards` (metadata only, no audio) and
      `POST /api/recordings/batch` (audio for specific requested words).
      Driven by on-the-go's local-cache design — see that repo's
      `adr/ADR-001-word-recordings.md`.
- [ ] Replace the default `create-next-app` `page.tsx` with the actual
      dashboard/display this repo is meant to provide.

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
