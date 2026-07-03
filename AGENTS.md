# AGENTS.md — Digital Pandharpur (Varkari)

Next.js 15 · App Router · React 19 · TypeScript · Bun · Prisma (CockroachDB/PostgreSQL)

## Runtime & Package Manager

- **Always use `bun`**, never `npm`/`yarn`. Lockfile is `bun.lock` (not `.lockb`).
- All scripts run via `bun run <script>`, not `npm run`.

## Essential Commands

```bash
bun dev              # Dev server
bun run lint         # ESLint (flat config, very permissive — unsafe rules off)
bun run typecheck    # tsc --noEmit
bun test             # All tests (bun:test, not Jest)
```

### Build (unusual chain — runs in order)

```bash
bun build
# 1. scripts/switch-provider.ts — auto-detects CockroachDB vs PostgreSQL from DATABASE_URL
# 2. prisma generate
# 3. prisma db push --accept-data-loss
# 4. bun run db:seed
# 5. next build
```

### Database

```bash
bun run db:generate        # prisma generate
bun run db:migrate         # prisma migrate dev
bun run db:migrate:prod    # prisma migrate deploy
bun run db:seed            # src/db/seed.ts (runs automatically during build too)
bun run db:push            # prisma db push (inside build script)
bun run db:studio          # prisma studio
```

### CLI Data Tools

```bash
bun run canonical    # src/cli/canonical.ts — dedup engine
bun run enrich       # src/cli/enrich.ts — AI enrichment pipeline
bun run scrape       # src/cli/scrape.ts — deprecated, editorial ingestion preferred
bun run acquire:all  # src/cli/acquire-all.ts — bulk content acquisition
bun run graph:build  # scripts/build-graph.ts — build EntityGraphEdge table
```

### Search Indexing

```bash
bun run scripts/index-search.ts   # Index compositions → Meilisearch
```

### Utility Scripts

```bash
bun run scripts/check-db.ts       # Inspect DB state
bun run scripts/backup.ts         # Backup database
bun run scripts/test-api-security.ts  # API security tests
bun run scripts/verify-pages.ts    # Page rendering smoke tests
```

## Testing

- Framework: **`bun:test`** (`describe`/`it`/`expect` — no Jest).
- Tests in **two locations**:
  - `tests/unit/*.test.ts` — Unit tests (7 suites)
  - `tests/integration/*.test.ts` — Integration tests (DB + search)
  - `tests/e2e/composition-flow.test.ts` — E2E
  - `src/canonical/__tests__/matching.test.ts` — Canonical engine tests
- Run single file: `bun test <path>` (e.g. `bun test tests/unit/search-client.test.ts`)
- Test setup/environment in `tests/setup.ts` (mocks env vars, sets timeouts)
- Run all suites: `bun test` (discovers `**/*.test.ts` automatically)
- Some tests need running services (DB, Meilisearch). Check `tests/integration/`.

## TypeScript Quirks

- `strict: true` + `strictNullChecks: true` **but** `noImplicitAny: false` — explicit types required but implicit `any` does not error.
- `@/*` path alias maps to root (`./*`), so `@/src/db/client` resolves correctly.
- **CLI files** (`src/cli/`, `scripts/`, `tests/`) excluded from `tsconfig` — they compile through Bun directly.
- Scripts often use `// @ts-nocheck` at top. Follow this pattern for script files.
- `.ts`/`.tsx` extensions required in all imports. No barrel re-exports in components/.

## Code Style

- **Files**: `kebab-case.ts`, `kebab-case.tsx`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Components**: `PascalCase` (React convention)
- No barrel re-exports in `components/`. Import directly.
- Explicit `.ts`/`.tsx` import extensions (Next.js requirement).

## Database Provider

- **Dynamic switch**: `scripts/switch-provider.ts` runs at build start and rewrites `prisma/schema.prisma` between `cockroachdb` and `postgresql` based on DATABASE_URL.
- The current `.env` uses **CockroachDB** (cockroachlabs.cloud). The schema file in source is `cockroachdb`.
- **Never manually edit the `provider` line** in `prisma/schema.prisma` — the switch script handles it.
- Prisma client is cached globally across hot reloads in `src/db/client.ts` (standard Next.js pattern).

## AI Enrichment — Free LLM Providers

The enrichment pipeline (`src/ai-enrichment/`) supports **free-tier providers** — no OpenAI key needed:

| Provider | Env Var | Model (default) |
|----------|---------|-----------------|
| Groq (recommended) | `GROQ_API_KEY` | `mixtral-8x7b-32768` |
| Google Gemini | `GEMINI_API_KEY` | `gemini-1.5-flash` |
| Ollama (local) | — | `gemma2:9b` |

Set `LLM_PROVIDER=groq|gemini|ollama|auto`. Auto-detection order: `LLM_API_KEY → GROQ_API_KEY → GEMINI_API_KEY → local Ollama`.

## Search Infrastructure

- **Meilisearch** is the primary search engine (configured in `src/lib/search-client.ts`).
- Two env var prefixes are used: `MEILISEARCH_URL`/`MEILISEARCH_API_KEY` (in `.env`) AND `MEILI_HOST`/`MEILI_MASTER_KEY` (in code fallback). Both exist in code paths — check `search-client.ts` for which is used where.
- **OpenSearch** also configured in `docker-compose.yml` and `src/lib/opensearch-client.ts` for future use.
- Run `docker compose -f deployment/docker-compose.yml up -d` for local Meilisearch.

## Canonical Dedup System

```
Composition → canonicalId → CanonicalRecord
                                   ↓
                         CanonicalSourceMapping (source variants)
```

Confidence thresholds:
- `≥ 0.90`: auto-merge duplicates
- `0.70–0.89`: suggest for editor review
- `≤ 0.69`: reject as non-duplicate

See `src/canonical/` for the engine, `src/cli/canonical.ts` for the CLI.

## Key Architecture Boundaries

```
app/           — Next.js App Router pages + API routes
components/    — React components (no barrel exports)
src/
  ai-enrichment/   — LLM enrichment pipeline
  book-generation/ — Book commerce (PDF/EPUB generation, covers)
  canonical/       — Dedup engine
  cli/             — CLI entry points (excluded from tsconfig)
  community/       — Corrections, verification, versioning
  db/              — Prisma client + seed data
  discovery/       — Content source discovery
  knowledge-graph/ — EntityGraphEdge traversals
  lib/             — Shared utilities (search, SEO, auth, OCR, etc.)
  scraper/         — Deprecated web scrapers (gitignored)
scripts/         — One-off scripts (also excluded from tsconfig)
tests/           — Test suites (unit, integration, e2e)
deployment/      — Docker Compose (PostgreSQL, Redis, OpenSearch, Meilisearch)
```

## Important Constraints

- **Scraper code** in `src/scraper/`, `src/cli/scrape.ts`, `app/api/scrape/` is gitignored and _deprecated_. Editorial ingestion is preferred. Do NOT modify or rely on these.
- **Middleware** (`middleware.ts`) applies security headers + CSRF origin check on all routes.
- **Next.js config** (`next.config.js`): `output: 'standalone'`, React Compiler experimental, `bun:sqlite` as webpack external.
- **E-commerce models** (orders, payments, print partners, addresses) exist in the schema but the frontend is early-stage.
- **Environment variables**: `.env` is committed (dev only). For production, see `env-production.example`.
- **`.omo/` directory**: Contains continuation session data for OpenCode — gitignored runtime state, do not commit.

## ESLint (unusually permissive)

The flat config disables nearly all type-aware rules:
- `@typescript-eslint/no-explicit-any: off`
- `no-unsafe-assignment/member-access/call/return: off`
- `no-require-imports: off`
- Only `no-unused-vars: warn`

Don't rely on ESLint to catch type errors. Use `bun run typecheck` instead.

## Project Rules

- **Stack**: React + Node.js + PostgreSQL.
- **No unnecessary frameworks**: Do not introduce new frameworks or libraries unless there is a clear, justified need.
- **RESTful APIs**: Keep API routes RESTful. Use `route.ts` files in `app/api/`.
- **Maintain folder structure**: Do not reorganize directories. Place new files following existing conventions documented above.
- **Reusable components**: Prefer extracting reusable React components over duplicating markup.
- **Schema changes via Prisma Migrate only**: Edit `prisma/schema.prisma`, then run `bun run db:migrate` to generate a new migration. Never manually edit an already-applied migration file in `prisma/migrations/`.
- **Schema changes need explanation**: Every schema change must include a comment or commit message explaining the reason.
- **All code production-ready**: No TODO comments, no dev-only stubs, no debug logging in committed code. Handle errors properly with typed catches or `Result<T, E>` pattern.
- **Offline deployment compatibility**: Do not introduce dependencies on external services that cannot be self-hosted or mirrored for air-gapped deployments. Pin dependency versions explicitly.
