# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- Development server: `bun dev`
- Build for production: `bun build`
- Lint code: `bun lint`
- Type check: `bun typecheck`
- Run tests: `bun test`
- Run a single test: `bun test src/**/your_test_file.test.ts`
- Database generate: `bun run db:generate`
- Database migrate: `bun run db:migrate`
- Database migrate production: `bun run db:migrate:prod`
- Database seed: `bun run db:seed`
- Open Prisma Studio: `bun run db:studio`
- Run canonical CLI: `bun run canonical`
- Run enrich: `bun run enrich`
- Run scrape: `bun run scrape`
- Run acquire all: `bun run acquire:all`
- Build knowledge graph: `bun run graph:build`

## Architecture Overview

- **Tech Stack**: Next.js 15 (App Router), React 19, TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **Search**: Meilisearch with Devanagari and Roman transliteration support
- **Runtime**: Bun (uses `Bun.env`, `Bun.file()`, `$` from `bun:shell`)

- **Canonical Workflow**: Uses canonical IDs to deduplicate compositions from multiple sources. See `src/canonical/` for implementation.

- **Data Model**: Core Prisma entities include Saint, Composition, Deity, Festival, Category, Temple, Book, and EntityGraphEdge for knowledge graph relationships.

- **Directory Structure**:
  - `app/`: App Router pages and API routes organized by feature (e.g., abhang, sant, category, festival, search, graph)
  - `components/`: UI components with no barrel re-exports
  - `src/`: Main source including ai-enrichment, canonical, community, db, knowledge-graph, lib, scraper
  - `scripts/`: One‑off scripts for indexing, graph building, DB checks
  - `prisma/`: Prisma schema and migrations

- **Design System**: Uses a cultural color palette (Saffron, Deep Maroon, Temple Gold, secondary colors) and typography optimized for Devanagari and Latin scripts.

- **API Routes**: Key routes include `/api/search`, `/api/graph/*`, `/api/festival/current`, `/api/scrape` (disabled in early phases).

- **Testing**: Uses `bun:test`; run a single test with `bun test path/to/file.test.ts`; all tests with `bun test`.

## Typical Workflow

1. Make changes locally.
2. Run `bun dev` to see the development server.
3. Run `bun lint` and `bun typecheck` to verify code quality.
4. Run relevant tests with `bun test`.
5. When database changes are needed, run `bun run db:generate`, `bun run db:migrate`, and `bun run db:seed`.
6. Use CLI utilities (`bun run canonical`, `bun run enrich`, `bun run scrape`) as needed.

## Notes for Future Instances

- Follow the existing code patterns: explicit file extensions in imports, kebab-case for files, camelCase for functions.
- Respect the design system and cultural considerations.
- Ensure all new UI respects `prefers-reduced-motion`.
- Keep database migrations in sync with code changes.