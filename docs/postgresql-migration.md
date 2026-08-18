# PostgreSQL Migration — Phase 1

**Status:** Complete
**Date:** 2026-08-11

## Summary

The application's datasource has been switched from SQLite (`prisma/dev.db`) to
PostgreSQL. The Prisma schema, application code (`src/db/client.ts`), and
provider-switching tooling (`scripts/switch-provider.ts`) already supported
this dual-provider design — this migration activates it and backfills the
real composition dataset.

## What changed

- `prisma/schema.prisma` — `datasource db.provider` is now `postgresql`
  (previously `sqlite`). The header comment was updated to describe the
  provider-switching behavior instead of defaulting the reader to SQLite.
- `.env` — `DATABASE_URL` now points at a PostgreSQL connection string
  instead of `file:./dev.db`.
- `scripts/sync-sqlite-to-pg.ts` — fixed a hardcoded source path
  (`data/varkari.db`, which does not exist) to `prisma/varkari.db` by
  default, overridable via `SQLITE_SOURCE_PATH`.
- `docker-compose.yml` — added, providing an optional local Postgres
  container for machines without a native Postgres install.

## Local development database

This machine already had a **native PostgreSQL 18** Windows service running
on port 5432. Docker Desktop's own port-forwarding for a containerized
Postgres silently lost the binding race against that native service, which
caused confusing `P1010` authentication errors when connecting from
Windows-native processes (Prisma CLI, Node). Connections issued *inside* the
Docker network (e.g. `docker exec`, or containers on the same
`docker compose` network) worked fine the whole time — only host-to-container
port-mapped connections were affected.

**Resolution:** standardized local development on the native PostgreSQL 18
instance instead of fighting the port conflict:

- Role: `varkari` / password: `varkari_dev_password` (local dev only —
  never used in any deployed environment)
- Database: `varkari`, owned by the `varkari` role
- Connection string: `postgresql://varkari:varkari_dev_password@127.0.0.1:5432/varkari?schema=public`

The `docker-compose.yml` file remains available for contributors who don't
have a native Postgres install; see the comment at the top of that file for
how to avoid the same port conflict (change the host port mapping or stop
the native service first).

## Data migration

The canonical, human-reviewed dataset (312 compositions, previously sitting
unused in the archival `prisma/varkari.db` SQLite file) was synced into
PostgreSQL via `bun run scripts/sync-sqlite-to-pg.ts`.

Result: **321 total compositions** in PostgreSQL (312 newly synced + 9
pre-existing seed compositions with different slugs — no rows were
overwritten or lost).

### Data quality finding (pre-existing, not introduced by this migration)

The source `varkari.db` has significant duplication in its reference tables:

| Table | Raw rows | Distinct by unique key (`name_transliteration`) |
|---|---|---|
| saints | 81 | 9 |
| deities | 133 | 7 |
| festivals | 133 | 7 |

`sync-sqlite-to-pg.ts` upserts these by `name_transliteration` (a `@unique`
Prisma field), so the sync correctly deduplicated them rather than creating
81/133/133 duplicate rows. This is a **pre-existing data quality issue in the
historical scrape**, not something this migration caused — flagging it here
so it can be addressed as a follow-up (e.g. re-running AI enrichment/dedup
tooling already present in `src/canonical/` against the full saint/deity/
festival reference data, not just compositions).

## Verification performed

```
bun run scripts/sync-sqlite-to-pg.ts
# ✓ Synced 312/312 compositions (0 skipped — unmapped saints)

# via the app's actual resilient db client (src/db/client.ts):
Total compositions: 321
Verified: 321
By type: stotra 100, abhang 94+6, aarti 74+1, bhajan 19, gaulani 11,
         haripath 5+1, deviche_gane 4, namasmaran 3, kirtan 2, stotra(dup-case) 1
```

Note the mixed-case type values (`ABHANG` vs `abhang`, etc.) surfaced by this
verification — a pre-existing normalization gap in the `type` field, tracked
as a follow-up (see "Known follow-ups" below).

## Known follow-ups (not yet addressed)

1. **Composition `type` casing** — values like `ABHANG` and `abhang` both
   exist. Should be normalized (lowercase canonical enum-like values) with a
   data migration + application-level validation on write.
2. **Saint/Deity/Festival dedup** — the 81→9 / 133→7 / 133→7 collapse above
   should be reviewed by a content editor to confirm no legitimately distinct
   entities were merged, and the source scrape/import path should be fixed to
   stop producing duplicates.
3. **Shadow database for `prisma migrate dev`** — this migration used
   `prisma db push` (schema already matched the target 1:1, so this was safe
   and non-destructive). For future schema changes, use
   `prisma migrate dev` to generate a proper, auditable migration history —
   this requires `varkari` to have `CREATEDB` (already granted) so Prisma can
   create its shadow database.
