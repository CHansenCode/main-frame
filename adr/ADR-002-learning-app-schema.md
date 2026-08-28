# ADR-002: Schema for the Learning app (decks, cards, attempts, recordings)

## Status

Accepted. Supersedes the single-file `card_groups`/`cards` migration
committed under ADR-000's earlier "design the first schema migration"
to-do — that migration predates this ADR and needs to be reworked to
match it before it's pushed (see ADR-000 to-dos).

## Context

on-the-go's "Learning" tab (branch `claude/android-app-chat-dev-6ce6lt`)
is a flashcard app, currently backed entirely by client-side dummy data
(`data/flashcards.ts`): a flat list of English-gloss / language-one /
language-two triples, plus per-card `timesCompleted` / `lastCompleted`
counters that live only in memory. This ADR designs the main-frame schema
that data moves into, plus two features the dummy data doesn't have yet:
recording which direction a review went (needed because the front end
shuffles display order, so direction can't be inferred positionally) and
whether it was answered correctly — including failures, not just
successes — and attaching optional recorded audio to individual words.

## Decision

### Four tables, hierarchically named

```
decks
decks_cards
decks_attempts
word_recordings
```

`decks`/`decks_cards`/`decks_attempts` share the `decks_` prefix to make
the family relationship visible in the table name itself, not just via
foreign keys. `word_recordings` deliberately does **not** take that
prefix — see below, it isn't scoped to a deck.

```sql
-- CONFIG: one row per language-pair/category
CREATE TABLE "decks" (
  "id"                 serial PRIMARY KEY,
  "name"               text UNIQUE NOT NULL,
  "language_one_label" text NOT NULL,
  "language_two_label" text NOT NULL,
  "created_at"         timestamptz NOT NULL DEFAULT now()
);

-- CONTENT: the static word triples, nothing mutable
CREATE TABLE "decks_cards" (
  "id"            serial PRIMARY KEY,
  "deck_id"       integer NOT NULL REFERENCES "decks" ON DELETE CASCADE,
  "language_eng"  text NOT NULL,   -- English gloss; renamed from `name`
  "language_one"  text NOT NULL,
  "language_two"  text NOT NULL,
  "created_at"    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "decks_cards_deck_id_index" ON "decks_cards" ("deck_id");

-- LEDGER: one row per submitted review, success or failure
CREATE TABLE "decks_attempts" (
  "id"           bigserial PRIMARY KEY,
  "card_id"      integer NOT NULL REFERENCES "decks_cards" ON DELETE CASCADE,
  "direction"    text NOT NULL CHECK ("direction" IN ('one_to_two', 'two_to_one')),
  "is_correct"   boolean NOT NULL,
  "actor"        text,             -- who submitted it; nullable, see below
  "completed_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "decks_attempts_card_id_index" ON "decks_attempts" ("card_id");
CREATE INDEX "decks_attempts_completed_at_index" ON "decks_attempts" ("completed_at");

-- Loosely-coupled audio, matched by word text rather than a foreign key
CREATE TABLE "word_recordings" (
  "id"           serial PRIMARY KEY,
  "word"         text NOT NULL UNIQUE, -- the word itself — always lower-cased
  "audio_data"   bytea NOT NULL,       -- raw AAC (.m4a) bytes, see below
  "recorded_by"  text,
  "recorded_at"  timestamptz NOT NULL DEFAULT now(),
  CHECK ("word" = lower("word"))
);
```

`decks_cards.language_eng` replaces the earlier `name` column — same
data (the English gloss), renamed for symmetry with `language_one` /
`language_two` now that all three are visibly "a language slot" rather
than one of them reading as a generic label.

### `decks_attempts` replaces the dummy data's per-card counters

on-the-go's `Card.timesCompleted` / `Card.lastCompleted` are dropped
entirely rather than carried over — keeping a running counter *and* a
per-event log invites the two drifting apart. `COUNT(*)` /
`MAX(completed_at)` against `decks_attempts` (optionally filtered by
`actor`) replace them as queries instead of columns.

`direction` is `CHECK`-constrained to two values now; if attempts ever
need a third state (skipped, timed out) it should become a richer `text`
column, not have a value bolted onto this one.

`actor` is nullable free text, not a foreign key to a users table,
because on-the-go's two branches disagree on the auth model (`2l3rm8`'s
mock two-account login vs. `6ce6lt`'s free-text "Your name" Settings
field vs. no attribution at all) and that fight is explicitly deferred
(see on-the-go's ADR-000). A ledger that can't say who did what is a
poor fit for a tool built for two named people to share, so `actor` is
included now rather than added later — but as a plain nullable column so
it doesn't have to wait on, or get invalidated by, whichever way that
auth decision eventually goes.

### `word_recordings`: loosely coupled by word text, not by foreign key

Rather than attaching audio to a specific `decks_cards` row (by
`card_id` + which slot), `word_recordings` stores just the `word` itself
and is matched by a `LEFT JOIN` on that text when cards are fetched:

```sql
SELECT
  dc.*,
  wr1.audio_data AS language_one_audio_data,
  wr2.audio_data AS language_two_audio_data
FROM decks_cards dc
LEFT JOIN word_recordings wr1 ON wr1.word = lower(dc.language_one)
LEFT JOIN word_recordings wr2 ON wr2.word = lower(dc.language_two)
WHERE dc.deck_id = $1
-- ... plus whatever narrows this down to the user's chosen word count
```

This is a deliberate middle ground between two earlier options: keeping
`decks_cards.language_one`/`language_two` as plain text (no normalizing
them out into a shared words table), while still getting the win a
shared words table would give — the same word recorded once is reused
everywhere it appears, with no explicit relationship to maintain between
`decks_cards` rows and the word that happens to recur. The cost is that
the join key is the word's text rather than a stable id, so it depends
on the case-normalization guarantees below to actually match reliably.

There's deliberately no `language` column narrowing that match. An
earlier draft of this table kept one, matched against `decks`'
`language_one_label`/`language_two_label` — but those labels are free
text with no independent identity (see the alternative below); dropping
`language` was chosen over adding a canonical language-code column to
`decks` to give the match something real to key on. The accepted
tradeoff: two different languages that happen to share an identical
spelling would incorrectly share one recording. With only Swedish and
Lithuanian in play today this is a low-probability, low-stakes
collision, not a correctness property worth the extra schema surface —
worth revisiting if a language pair with real spelling overlap (or a
third deck) shows up.

On the client (on-the-go): after fetching a deck's cards (post
group-and-word-count selection) with recordings left-joined in, a card
whose `language_one_audio_url` / `language_two_audio_url` comes back
`NULL` conditionally shows a "record this" button, letting either person
record it for the other to hear. This is intent for that feature, not
yet built — on-the-go's own ADR should pick this up once implemented.

### Case normalization

Two words that differ only in capitalization (`"Hej"` vs `"hej"`) must
not become two different `word_recordings` rows — that would silently
defeat the whole point of the loose word-text match above. Two guards,
not one:

1. **At the query site:** both sides of the `LEFT JOIN` condition go
   through `lower(...)` (shown above), so a `decks_cards` row with
   unexpected capitalization still matches an existing recording instead
   of missing it.
2. **At the table itself:** `CHECK ("word" = lower("word"))` on
   `word_recordings`. This is the guard against a server/API layer that
   forgets to lower-case before writing a new recording row — instead of
   silently inserting a `"Hej"`/`"hej"` pair as two distinct,
   never-matching rows, the insert fails loudly. The expectation is that
   whatever writes to this table always lower-cases first; the
   constraint exists to catch the case where that expectation is
   violated, not as the primary mechanism.

### Storage: raw bytes in Postgres, not an external URL

There's no CDN or object-storage service on this project, and adding one
(Vercel Blob, S3, etc.) turns out not to be necessary at this scale.
Neon's free tier gives the whole project 0.5 GB of storage, shared across
the `main`/`preview` branches ADR-001 already set up — the delta each
branch adds counts against one combined pool, not 0.5 GB each ([Neon
plans](https://neon.com/docs/introduction/plans), [Neon cost
optimization docs](https://neon.com/docs/introduction/cost-optimization)).
Budgeting 20% of that total for audio (~102 MiB) and storing 3-second
clips as AAC (`.m4a`) — Postgres's automatic TOAST compression buys
almost nothing extra on top of already-compressed audio, so these
figures are close to the real on-disk cost — comfortably fits over 2,000
words even at a generous 128 kbps:

| Bitrate | ~Size / 3s clip | Words in 20% budget |
|---|---|---|
| AAC 64 kbps | ~24 KB | ~4,369 |
| AAC 96 kbps | ~36 KB | ~2,913 |
| AAC 128 kbps | ~48 KB | ~2,185 |

That's an order of magnitude more than the 100-word deck that exists
today, so `word_recordings.audio_data bytea` storing raw bytes directly
is accepted as fine for now rather than provisional.

One open consequence of this choice: the `LEFT JOIN` above no longer
hands back a plug-and-playable URL the way the original `audio_url`
design did — on-the-go's audio player needs a URI to point at, not a
raw byte blob sitting inside a JSON response. Two ways to bridge that,
neither picked yet: a dedicated `GET /api/recordings/:id` route that
streams the bytes back with `Content-Type: audio/mp4` (lets HTTP caching
do some work, keeps card-list payloads small), or inlining each
recording as a base64 data URI directly in the card-list response (one
request instead of two, and base64's ~33% overhead is irrelevant at
these sizes). Left to the future API-build to-do — flagging it now so
it's a deliberate pick then, not a surprise.

### Requirements this places on the write path (API route, not yet built)

Whatever endpoint eventually accepts a new recording (from on-the-go's
"record this" button) carries three obligations, each guarding something
the schema alone can't enforce on its own:

1. **Lower-case the word server-side before matching or inserting.** The
   `CHECK` constraint on `word_recordings.word` will reject anything
   else, but that's the backstop, not the plan — the route should
   normalize proactively so a legitimate upload never trips it. Never
   trust that the client already lower-cased it.
2. **Verify the uploaded audio is actually AAC — don't trust the
   request's declared `Content-Type`.** A client (buggy or malicious) can
   claim any content type it likes; the route needs to inspect the
   actual file, e.g. via a metadata-parsing library such as
   `music-metadata` (reads container/codec info without shelling out to
   `ffmpeg`, which fits better in a Vercel serverless function anyway),
   and reject anything that doesn't decode as AAC/`.m4a`.
3. **Reject recordings longer than 10 seconds.** on-the-go's front end
   should warn the user and prompt a re-record before upload even
   happens — but that's a UX courtesy, not a security boundary, since
   nothing stops a modified or buggy client from sending something
   longer anyway. The server enforcing the same 10-second ceiling is
   what actually protects the storage budget calculated above; the two
   layers should agree on the same number so the client's warning and
   the server's rejection never disagree.

None of this write path exists yet — this section records what it will
be required to do, not an implementation.

## Consequences

- The migration already committed locally (single `card_groups`/`cards`
  pair, no `decks_attempts` or `word_recordings`, no `language_eng`
  rename) is now out of date and needs to be reworked to match this ADR
  before anything gets pushed. Nothing has been applied to a real
  database yet, so this can still be rewritten in place rather than
  needing a follow-up migration.
- `decks_attempts` is append-only and unbounded — no retention/archiving
  policy is decided yet. Fine at current scale (two users, a few hundred
  cards); worth revisiting if this ever grows large enough to matter.
- `actor`'s nullable-free-text shape is intentionally provisional. Once
  on-the-go's auth-model question is actually resolved, this ADR's
  `actor` column should be revisited (a real foreign key, backfilling
  existing rows, etc.) rather than treated as the final answer.
- `word_recordings` has no `deck_id` and isn't scoped to one — a
  recording made for a word in one deck is available to any other deck
  that happens to reuse the same `(language, word)` pair. This is the
  intended behavior (recording once, reusing everywhere), not an
  oversight.

## Alternatives Considered

- **Single flat `cards` table** (original first-pass schema, before this
  ADR) — one table with `group`, `language_one_label`,
  `language_two_label`, `times_completed`, `last_completed` columns
  directly on each row. Simpler, but repeats the group's labels on every
  row with no structural guarantee two rows in the same group agree, and
  conflates static content with mutable review state. Rejected in favor
  of the config/content/ledger split above.
- **Foreign-keyed audio** (`decks_audio` referencing `decks_cards.id` +
  a `slot` column) — considered before `word_recordings`. Simpler to
  join and query, but ties a recording to one specific card row instead
  of the word itself, so the same word appearing in a different card (or
  a future deck) would need re-recording instead of reusing the existing
  audio.
- **Fully normalized words** (`decks_words` table; `decks_cards`
  references `word_one_id`/`word_two_id`; audio attaches to the word
  id) — gets the same reuse benefit as `word_recordings` but via a hard
  foreign-key relationship instead of a text match, and would require
  lifting every existing `decks_cards` row's words out into `decks_words`
  as part of the migration. Rejected as more structure than the loose
  `word_recordings` join needs to pay for the same benefit.
- **`language` column on `word_recordings`, keyed to canonical
  `language_one_code`/`language_two_code` columns added to `decks`** —
  would have kept the match scoped per-language (no cross-language
  collision risk) without relying on the free-text display labels, which
  have no independent identity and could drift between decks. Rejected
  for now as more schema than the collision risk justifies with only two
  languages in play; revisit if a third deck or an actual collision shows
  up.
- **External object storage (Vercel Blob, S3, etc.) for recordings,
  with `word_recordings.audio_url` pointing at it** — the original plan,
  before checking actual numbers. Rejected once the math showed Neon's
  free-tier storage comfortably fits thousands of 3-second AAC clips at
  a fraction of the project's total budget; adding a second storage
  service isn't worth it at this scale. Worth revisiting only if audio
  volume or clip length grows enough to threaten the Neon storage
  budget.
