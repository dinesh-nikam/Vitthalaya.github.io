# Prisma & Database Migration Rules

This file governs all database models, schema modifications, and migrations.

## Critical Architectural Constraints

1. **Datasource Provider Immutability**:
   - `scripts/switch-provider.ts` rewrites the datasource `provider` line in `prisma/schema.prisma` dynamically from `DATABASE_URL` (supporting SQLite, PostgreSQL, and CockroachDB).
   - **Never manually edit the `provider` line** — it is overwritten automatically during `bun run build`.

2. **Migration Workflow**:
   - **Do NOT run `prisma migrate dev`**. It is strictly prohibited in this project.
   - All schema evolutions must be declared as flat SQL files under `prisma/migrations/*.sql`.
   - Apply migrations via:
     ```powershell
     bun run db:sqlmigrate
     bun run db:generate
     ```
   - Schema field additions in `schema.prisma` and their corresponding flat SQL migration must always land together in the same changeset.

3. **Client Regeneration**:
   - The Prisma client can lag schema edits. Whenever modifying `schema.prisma` or applying migrations, immediately run `bun run db:generate` to regenerate the TypeScript bindings and prevent runtime errors.
