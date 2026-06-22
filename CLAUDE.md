# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
bun dev

# Build for production
bun build

# Run lint (includes type-aware rules)
bun lint

# Type check
bun typecheck

# Run tests (if any in src/)
bun test

# Database operations
bun run db:generate     # Generate Prisma client
bun run db:migrate      # Run migrations (dev)
bun run db:migrate:prod # Run migrations (production)
bun run db:seed         # Seed database with initial content
bun run db:studio       # Open Prisma Studio

# CLI utilities
bun run canonical       # Canonical record management (deduplication)
bun run enrich          # AI enrichment pipeline
bun run scrape          # Scrape devotional content (CLI)
bun run acquire:all     # Acquire content from all sources
bun run graph:build     # Build knowledge graph from compositions

# Miscellaneous scripts
bun run scripts/index-search.ts    # Index compositions to Meilisearch
bun run scripts/build-graph.ts   # Build knowledge graph
bun run scripts/check-db.ts      # Inspect database state
bun run scripts/backup.ts        # Backup database
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma ORM
- **Search**: Meilisearch with Devanagari + Roman transliteration support
- **Runtime**: Bun (uses `Bun.env`, `Bun.file()`, `$` shell from `bun:shell`)

### Canonical Workflow (Deduplication)

The platform uses a canonical record system to deduplicate compositions from multiple sources:

```
Composition → canonicalId → CanonicalRecord
                                   ↓
                         CanonicalSourceMapping (source variants)
```

- **CanonicalRecord**: The "master" version with composite score for ranking
- **CanonicalSourceMapping**: Each variant text with confidenceScore and source attribution
- **Review process**: Multiple variants merged when confidence > threshold (default 0.7)

Use `bun run canonical` CLI for deduplication operations. See `src/canonical/` for the engine.

#### Confidence Thresholds
- `auto_merge`: ≥ 0.90 — Automatically merge duplicates
- `suggested`: 0.70–0.89 — Show as suggested match for editor review
- `rejected`: ≤ 0.69 — Reject as non-duplicate

### Data Model (Prisma)
Core entities in `prisma/schema.prisma`:
- **Saint** → compositions, related saints, birth region
- **Composition** → saint/deity/festival relations, `reviewed: Boolean` flag for editorial workflow
- **Deity**, **Festival**, **Category**, **Temple**, **Audio**, **Book**
- **EntityGraphEdge** → polymorphic edge table for knowledge graph relationships

### Directory Structure

```
app/                 App Router pages and API routes
├── abhang/[slug]/   Composition detail pages
├── api/             tRPC-like API handlers (no tRPC, direct route.ts files)
├── category/[slug]/   Category browsing
├── festival/[slug]/   Festival-specific compositions
├── search/          Search results with filters
├── sant/[slug]/     Saint biography and works
└── graph/           Knowledge graph exploration

components/          UI components (no barrel re-exports)
src/
├── ai-enrichment/   Batch processing, enrichment queue, review
├── canonical/       Duplicate detection, fuzzy matching, normalization
├── community/       Corrections, user verification, versioning
├── db/              Prisma client, seed scripts, scraper integrator
├── knowledge-graph/ GraphQL-style graph traversals, build scripts
├── lib/             Search client, SEO, festival calculator, utils
└── scraper/         Web scrapers for devotional content (BaseScraper pattern)

scripts/             One-off scripts (search indexing, graph building, testing)
```

### Knowledge Graph Architecture

The `EntityGraphEdge` table forms a polymorphic relationship graph connecting all entities:
- **Source/Target types**: Saint, Composition, Deity, Festival, Category, Temple, Book
- **Relationships**: authorship, theme, occasion, location-based, community-curated
- **Graph building**: Run `bun run scripts/build-graph.ts` to generate edges from data

### Upload & Moderation Pipeline (Phase 1+)

Content ingestion flows through a multi-stage pipeline:
1. **UploadedFile** - Initial submission (any format)
2. **OcrConsensusResult** - Multi-engine OCR voting (Google Vision + Tesseract + PaddleOCR)
3. **ModerationQueue** - Editorial review with 3-tier system (AI → Peer → Scholar)
4. **Composition** - Published after approval

## Content Workflow

### Editorial Review Process
- All compositions have `reviewed: Boolean` flag in database
- Scraped/imported content must have `reviewed: false` until manually verified
- Editor approval gates publication to production

### Scraping Policy (Phase 0-2)
Automated scraping is **disabled** in Phase 0-2. Content must come from:
1. Manual entry / contributor typing
2. OCR of out-of-copyright book scans
3. Government cultural archive sources
4. Editor approval → publish

Scraper code exists in `src/scraper/` but should not be executed; files to remove before launch are documented in `VALIDATION_REPORT.md`.

#### Scraping Ethics (for production use)
- **robots.txt compliance**: Respect before scraping
- **Rate limiting**: 1 request per 2 seconds with ±30% jitter
- **Attribution**: Store source URL for every composition
- **No login bypass**: Only public pages scraped
- **Manual review gate**: All scraped content reviewed before production

## Design System

### Colors
- **Primary**: Saffron `#FF7A1A` (Bhagwa) — spiritual significance
- **Deep Maroon**: `#6B1E1E` — traditional temple colors
- **Temple Gold**: `#C9A227` — diya glow accents
- **Secondaries**: Cream `#FFF8EC`, Sand `#F2E8D8`, Peacock Blue, Tulsi Green

### Typography
- **Devanagari**: Noto Sans Devanagari + Tiro Devanagari Marathi
- **Latin**: Inter
- Reading-optimized at 1.7-1.8 line-height

### Animations
All cultural animations respect `prefers-reduced-motion`:
- Diya pulse (css animation)
- Flag wave (temple flags)
- Particle drift (background ambiance)
- Bell swing (interactive feedback)

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/festival/current` | Current festival by date |
| `/api/search` | Search compositions with filters |
| `/api/graph/*` | Knowledge graph traversals |
| `/api/scrape` | Scraper trigger (disabled in Phase 0-2) |
| `/api/ai/*` | AI enrichment endpoints |
| `/api/canonical/*` | Deduplication/canonization API |

## Code Patterns

### Error Handling
- Use typed errors: `Result<T, E>` pattern or explicit `try/catch` with typed catches
- API routes return: 4xx for user errors, 5xx for system errors
- Never use `as any` or `@ts-ignore` — use `unknown` with type guards

### File Organization
- No barrel re-exports in `components/`
- Explicit `.ts`/`.tsx` extensions in imports
- kebab-case for files, camelCase for functions, UPPER_SNAKE_CASE for constants

### Testing
- Framework: `bun:test` (bundled with Bun, no Jest)
- Run single test file: `bun test src/canonical/__tests__/matching.test.ts`
- Run all tests: `bun test`

### TypeScript Configuration
- Strict mode enabled (`strict: true`, `strictNullChecks: true`)
- `noImplicitAny: false` — use explicit types but implicit any allowed
- Scripts and CLI files are excluded from tsconfig (see `exclude` array)
- Test files use `bun:test` describe/it/expect instead of Jest

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `MEILISEARCH_URL`, `MEILISEARCH_API_KEY` - Search service
- `NEXTAUTH_SECRET` - NextAuth configuration
- `x-api-key` header required for `/api/scrape` endpoint

## Verification Checklist
Before committing changes:
1. Type check clean: `bun run typecheck`
2. Lint clean: `bun run lint`
3. Changed files have proper Devanagari rendering if applicable
4. SEO metadata updated for new public pages
5. Accessibility attributes present for interactive elements
6. Editorial review flag (`reviewed: Boolean`) set correctly for content changes
