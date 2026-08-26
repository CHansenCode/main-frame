# ADR-0001: Staging/production environments, database branching, and migrations

## Status

Accepted

## Context

We wanted a staging environment on Vercel that auto-deploys on every merge
to `master`, plus a manual "promote to production" step, backed by a
Postgres database (Neon, provisioned via the Vercel Marketplace) with
schema migrations that run safely against the right database at the right
time. Vercel's Custom Environments feature — the obvious way to get a
named, persistent "staging" tier with its own domain — turned out to
require a paid (Pro) plan, which we're not on. The design below achieves
the same flow using only Vercel's basic (free) Production/Preview split.

## Decision

### Neon: two branches

- `main` — the production database.
- `preview` — a copy-on-write branch off `main`, used for both the staging
  deployment and, later, PR preview deployments. Branching is free-tier
  compatible; it's copy-on-write, not a full duplicate of storage/compute
  allowance.

### Vercel: branch-driven environments, no Custom Environments

- The project's **Production Branch** setting is changed from `master` to
  `production` — a branch that exists (created from `master`) but is not
  pushed to directly. Nothing about production deploys depends on commits
  landing on it; it exists solely so Vercel has *some* branch to point
  "Production" at, now that `master` no longer means "live."
- Because `master` is no longer the Production Branch, every push to
  `master` now lands as a **Preview** deployment instead — Vercel still
  gives it a stable, predictable branch URL. This is our staging
  environment, for free, with no Custom Environment needed.
- Environment variables are scoped using Vercel's native Production/Preview
  split:
  - **Production**-scoped `DATABASE_URL` → Neon `main` branch.
  - **Preview**-scoped `DATABASE_URL` → Neon `preview` branch (overridden
    away from the Marketplace integration's default, which otherwise
    points Production/Preview/Development at the same database).
  - **Development**-scoped `DATABASE_URL` → also the Neon `preview` branch,
    so local development never touches production data.
- Promotion to production is **manual**, via `vercel promote <url>`, which
  points production traffic at an already-built deployment **without
  rebuilding it**. The code that goes live in production is exactly the
  bits that were already running on staging.

### Migrations: node-pg-migrate

Three options were considered: `node-pg-migrate`, Drizzle, and Prisma. We
chose **node-pg-migrate** because it has no code-generation step — it's
plain SQL/JS migration files applied by a CLI command, nothing to build.
That matters specifically because `vercel promote` doesn't rebuild: the
migration step has to be fully decoupled from the build and run as its own
explicit action, twice — once against staging's database (on merge), once
against production's database (on manual promote, *before* the promote
call runs). Drizzle and Prisma both work here too, but each couples a
codegen step (`drizzle-kit generate`, `prisma generate`) into the
picture that node-pg-migrate simply doesn't have.

`node-pg-migrate`'s apply command (`node-pg-migrate up`) tracks applied
migrations in a `pgmigrations` table in the target database, so it's safe
to run repeatedly — running it when nothing's new is a no-op.

### Pipeline: two GitHub Actions workflows

1. **`.github/workflows/staging-deploy.yml`** — triggers on push to
   `master`. Pulls the Preview environment's variables from Vercel and
   runs `node-pg-migrate up` against the staging (`preview`) database.
   Vercel's own Git integration handles the actual build/deploy; this
   workflow only keeps that database's schema in sync with what just
   landed.
2. **`.github/workflows/promote-to-production.yml`** — triggers on
   `workflow_dispatch` (a manual button in the GitHub UI), taking the
   staging deployment URL to promote as input. It migrates the production
   database first, then calls `vercel promote` on that URL. Order matters:
   the schema must already be in place before traffic switches.

Both workflows need `VERCEL_TOKEN` as a repo secret, and `VERCEL_ORG_ID` /
`VERCEL_PROJECT_ID` as repo variables (non-secret; taken from
`.vercel/project.json`).

## Consequences

- Every PR preview deployment and the `master`/staging deployment all
  share the one Neon `preview` branch and its Preview-scoped env vars —
  they are not individually isolated from each other. This is an accepted
  simplification for now.
- A future improvement, independent of Vercel's plan tier, is per-PR Neon
  branches (via Neon's own branch-per-PR GitHub Action), giving each PR its
  own isolated copy-on-write database instead of sharing `preview`.
- The `production` git branch itself doesn't need to move — it exists only
  to satisfy Vercel's Production Branch setting. Nothing about our
  deployment mechanism depends on commits landing on it.
- If we ever upgrade to Vercel Pro, Custom Environments would let us give
  staging its own named tier (and its own env var scope, isolated from ad
  hoc PR previews) without changing the underlying Neon branch or
  migration approach.

## Alternatives Considered

- **Vercel Custom Environments** for a named "staging" tier — rejected for
  now; requires a Pro plan.
- **Drizzle** for migrations — a reasonable alternative; adds a typed
  schema/query builder at the cost of a `drizzle-kit generate` step that
  couples migrations to a build-time codegen step. Worth revisiting if the
  app outgrows raw SQL migrations.
- **Prisma** for migrations — heavier still; `prisma generate` needs to run
  anywhere the generated client is imported, coupling migrations state to
  the build lifecycle more than the other two options.
