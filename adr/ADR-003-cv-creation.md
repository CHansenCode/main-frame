# ADR-003: CV creation page, db storage, CRUD API, and PDF export

## Status

Accepted.

## Context

main-frame is the central db/server for the other repos in this
workspace (see the top-level `~/Projects/CLAUDE.md`). `crawler` crawls
the web for interesting job postings and, to the extent it can, submits
applications on its own — it's an independent process, not a client
main-frame is coupled to. But it needs CV data to work with, and per the
overall pattern already established with `decks`/`decks_cards` (ADR-002):
main-frame's db is the source of truth, main-frame's server owns the
read/write protocol, and other repos fan out from there as clients of
that API rather than holding their own copy of the data. This ADR is
main-frame's side of that: the tables, the CRUD API, an editing page,
and PDF export. `crawler`'s own use of this API (fetching a CV to tailor
an application, etc.) is out of scope here — that's `crawler`'s call to
make against whatever this ADR ships.

The scope, as given: (1) db tables holding everything a CV needs, (2) a
CRUD API layer over them, (3) an interactive main-frame page to
create/edit/delete CVs, (4) a PDF exporter for the pages that need one.
There can be more than one CV — the whole point of a page to
create/edit/delete them, plural, is supporting tailored variants per
application (a "backend focus" CV vs a "frontend focus" CV, etc.), not
one canonical document.

## Decision

### 1. Schema: one `cvs` row per document, typed child tables per section

Following ADR-002's precedent (explicit typed tables over a generic
key/value or EAV schema — a CV's sections are known and fixed, not
open-ended), each CV is one row in `cvs`, with each section a separate
child table referencing it. Lists that have a natural display order
(experience entries, bullets, skills, links, projects) carry a
`sort_order` integer column rather than relying on row-insertion order
or id order, since reordering is an explicit editing action the page
needs to support.

```sql
-- One row per CV document (one person, potentially many variants)
CREATE TABLE "cvs" (
  "id"         serial PRIMARY KEY,
  "owner_id"   integer NOT NULL REFERENCES "users" ON DELETE RESTRICT,
  "slug"       text NOT NULL,
  "title"      text NOT NULL,       -- internal label, e.g. "Backend focus"
  "full_name"  text NOT NULL,
  "email"      text,
  "phone"      text,
  "location"   text,
  "summary"    text,                -- freeform paragraph, nullable
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("owner_id", "slug")
);

-- Contact/portfolio links: GitHub, LinkedIn, personal site, etc.
CREATE TABLE "cv_links" (
  "id"         serial PRIMARY KEY,
  "cv_id"      integer NOT NULL REFERENCES "cvs" ON DELETE CASCADE,
  "label"      text NOT NULL,
  "url"        text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);

-- One timeline-shaped row per job / degree / side project. `type`
-- distinguishes the three instead of three near-duplicate tables --
-- experience, education, and projects all share the same shape (a
-- title, an optional date range, optional bullets), so a single table
-- with a `type` column replaces what would otherwise be three tables
-- differing only in a couple of column names.
CREATE TABLE "cv_entries" (
  "id"           serial PRIMARY KEY,
  "cv_id"        integer NOT NULL REFERENCES "cvs" ON DELETE CASCADE,
  "type"         text NOT NULL CHECK ("type" IN ('experience', 'education', 'project')),
  "title"        text NOT NULL,   -- job title / degree / project name
  "organization" text,            -- company / institution; NULL for project
  "location"     text,
  "url"          text,            -- project link; NULL for experience/education
  "start_date"   date,
  "end_date"     date,            -- NULL = present
  "sort_order"   integer NOT NULL DEFAULT 0
);
CREATE INDEX "cv_entries_cv_id_index" ON "cv_entries" ("cv_id");

CREATE TABLE "cv_entry_bullets" (
  "id"         serial PRIMARY KEY,
  "entry_id"   integer NOT NULL REFERENCES "cv_entries" ON DELETE CASCADE,
  "text"       text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);
CREATE INDEX "cv_entry_bullets_entry_id_index" ON "cv_entry_bullets" ("entry_id");

CREATE TABLE "cv_skills" (
  "id"         serial PRIMARY KEY,
  "cv_id"      integer NOT NULL REFERENCES "cvs" ON DELETE CASCADE,
  "category"   text,                -- nullable grouping, e.g. "Languages"
  "name"       text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);
CREATE INDEX "cv_skills_cv_id_index" ON "cv_skills" ("cv_id");
```

`sort_order` is scoped within a `(cv_id, type)` pair, not globally
across all of a CV's entries — the editor displays experience,
education, and projects as separate sections, each independently
reorderable, so "position 0" means something different per `type`.

`start_date`/`end_date` are nullable on the shared table (ADR-002-style
`decks_cards` would have made `start_date` `NOT NULL` for a
experience-only table) because `project` entries legitimately have
neither. Enforcing "experience/education rows need a `start_date`" is
left to the API layer, not a `CHECK` constraint, since that condition
depends on another column's value rather than being a fixed rule.

`degree`/`field` (education) and `name`/`description` (project) don't
get their own columns the way `cv_education`/`cv_projects` would have
had separately — `title` (e.g. "B.Sc. Computer Science" or a project's
name) and `cv_entry_bullets` (coursework/honors, or a project's
description broken into bullets) absorb what those columns held.
`organization` and `url` stay as dedicated columns rather than folding
into `title`/bullets too, since institution and project links are
structured enough (a distinct piece of data the page/PDF template
places separately from the title) to be worth keeping as their own
column even on a merged table.

Naming deviates slightly from ADR-002's `decks_*` convention: children
are prefixed `cv_` (singular) rather than `cvs_`, since `cvs` is already
plural as the table name for "many CV documents" and `cvs_entries`
reads worse than `cv_entries` without losing the visible parent/child
relationship the prefix is for.

`owner_id` is a real foreign key to `users`, not nullable free text.
ADR-002's `decks_attempts.actor` had to be nullable free text because no
`users` table existed yet when that decision was made — it's existed
since, and ADR-000 already has a to-do to revisit `actor` in light of
that. This table doesn't have that excuse, so it's a proper FK from the
start. (Worth reusing this as the actual fix when that `actor` to-do
gets picked up.)

`(owner_id, slug)` is unique, not `slug` alone — the slug is a
per-owner URL-friendly handle (`/cvs/backend-focus`), not a globally
unique one.

### 2. API: one nested-read endpoint per CV, granular CRUD for writes

Mirrors ADR-002's shape: reads return the whole joined document in one
request (cheap and simpler for a page that renders it all at once),
writes are granular per-row so the editing page can add/edit/delete one
experience entry, bullet, or skill without resending the whole
document.

- `GET /api/cvs` — list (id, slug, title, fullName, updatedAt) for the
  picker/list page.
- `POST /api/cvs` — create (slug, title, fullName required; everything
  else optional/empty).
- `GET /api/cvs/:id` — full nested document: scalar fields plus
  `links[]`, `experience[]` (each with `bullets[]`), `education[]`,
  `skills[]`, `projects[]` (each with `bullets[]`), each list ordered by
  `sort_order`.
- `PATCH /api/cvs/:id` — update scalar fields (title, fullName, email,
  phone, location, summary).
- `DELETE /api/cvs/:id` — delete; cascades to every child row.
- Per child resource, standard CRUD nested under the CV:
  `POST /api/cvs/:id/experience`,
  `PATCH /api/cvs/:id/experience/:experienceId`,
  `DELETE /api/cvs/:id/experience/:experienceId`, and the same
  `POST`/`PATCH`/`DELETE` trio for `education`, `skills`, `links`, and
  `projects`, plus bullets nested one level further
  (`POST /api/cvs/:id/experience/:experienceId/bullets`, etc., and the
  equivalent under `projects`).
- Reordering: one generalized endpoint rather than a bespoke one per
  list, since drag-and-drop always produces a full new ordering for one
  list at a time — `PATCH /api/cvs/:id/reorder` with body
  `{ "section": "experience", "order": [3, 1, 2] }` (ids in their new
  order), which the server maps to `sort_order` values in a transaction.
  The same endpoint handles bullets by accepting a `parentId` alongside
  `section: "experienceBullets"` (or `"projectBullets"`).

All of these sit behind the existing web NextAuth session
(`src/lib/auth.ts`), not `requireMobileAuth()` — this is main-frame's
own dashboard surface, the first real consumer of the web login path
that's existed since auth was wired up but never had a page to gate.
`owner_id` on create is taken from the session, not client-supplied.

### 3. Page: a CV list + a per-CV editor, both under main-frame's own dashboard

`/cvs` lists the signed-in user's CVs (title, slug, last updated) with
create/delete; `/cvs/[id]` is the editor — one page per CV covering all
sections, calling the granular endpoints above per edit rather than
saving the whole document at once. This becomes the first real content
under main-frame's own dashboard, picking up ADR-000's existing to-do
to replace the default `create-next-app` `page.tsx` — the CV list can
reasonably be (or link from) that landing page rather than staying a
separate, unrelated piece of work.

### 4. PDF export: rendered on demand via `@react-pdf/renderer`, not headless Chrome

`GET /api/cvs/:id/pdf` reruns the same nested-read query as
`GET /api/cvs/:id` and renders it to `application/pdf` bytes using
`@react-pdf/renderer` — a React-component-based PDF renderer that
produces the PDF directly (no browser involved), rather than Puppeteer
or Playwright driving headless Chrome against an HTML/CSS template.
Rendered fresh on every request; a CV is edited far more often than it
would be exported, and at this scale there's no reason to add a
regeneration/caching table for a render that's cheap to redo. No PDF
byte output is stored in the db — the exporter is a pure read-time
transform over `cvs`/its children, so a schema/content change is
reflected on the very next export with nothing to invalidate.

## Consequences

- `cv_experience_bullets` and `cv_project_bullets` are separate tables
  from a single `text[]` or newline-delimited column on their parent —
  more tables, but each bullet gets its own `sort_order` and id for
  editing/reordering individually, which a single text blob can't offer
  without the page parsing/reserializing it itself.
- The reorder endpoint's `section` string is a small stringly-typed
  surface (`"experience"`, `"education"`, `"skills"`, `"links"`,
  `"projects"`, `"experienceBullets"`, `"projectBullets"`) instead of
  one endpoint per list — accepted as the simpler option; if it ever
  needs per-section validation quirks that don't generalize, splitting
  back out is straightforward since nothing else depends on the shared
  shape.
- `cvs.owner_id` being a real FK (rather than nullable free text like
  ADR-002's `actor`) sets a precedent worth applying when
  `decks_attempts.actor` is revisited per ADR-000's existing to-do.
- None of this — schema, API, page, or exporter — is built yet; this
  ADR is the design, not the implementation.

## Alternatives Considered

- **Generic/EAV schema** (a `cv_fields` table of `(cv_id, section,
  key, value, sort_order)` covering every section with one table) —
  would avoid adding a table per section, but loses typed columns
  (`start_date`/`end_date` as real `date`s, `url` as its own column),
  loses per-section foreign keys, and makes every query a filter over
  one big undifferentiated table. Rejected for the same reason ADR-002
  rejected a single flat `cards` table: known, fixed structure doesn't
  benefit from schema-less flexibility.
- **Whole-document `PUT`** (the editing page holds the entire CV in
  client state and saves it as one big nested JSON blob, the server
  diffing and replacing all child rows in a transaction) — simpler
  client-side (one save action, no per-row endpoint plumbing) but pushes
  diffing logic server-side and makes a single stray edit anywhere
  trigger a full rewrite of every child table. Rejected in favor of
  granular CRUD, which matches ADR-002's existing API shape in this repo
  and keeps each edit's blast radius to the row it touched.
- **Headless-Chrome PDF export** (Puppeteer/Playwright rendering an
  HTML+CSS template, `@sparticuz/chromium` for the Vercel serverless
  build) — would let the exported PDF reuse the same HTML/CSS as an
  on-screen preview pixel-for-pixel, but adds real weight (a bundled
  Chromium binary, slower cold starts) that a component-based PDF
  renderer avoids entirely. Rejected at this scale; revisit only if the
  page ever needs the PDF to match a specific on-screen HTML layout
  exactly rather than a purpose-built PDF template.
- **Storing generated PDF bytes** (a `cv_pdf_exports` table, or a column
  on `cvs`, caching the last render) — rejected the same way ADR-002
  rejected external audio storage at small scale, just in the other
  direction: rendering is cheap enough that caching only adds
  invalidation complexity (knowing when a section edit makes a cached
  PDF stale) for no real benefit.
