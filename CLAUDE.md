# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
bun dev

# Build for production
bun build

# Run lint
bun lint

# Type check
bun typecheck

# Database operations
bun run db:generate     # Generate Prisma client
bun run db:migrate      # Run migrations (dev)
bun run db:migrate:prod # Run migrations (production)
bun run db:seed         # Seed database with initial content
bun run db:studio       # Open Prisma Studio

# CLI utilities
bun run canonical       # Canonical record management (deduplication)
bun run enrich          # AI enrichment pipeline
bun run scrape          # Scrape devotional content (outputs to data/scraped/)
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
├── knowledge-graph/ GraphQL-style graph traversals
├── lib/             Search client, SEO, festival calculator, utils
└── scraper/         Web scrapers for devotional content (BaseScraper pattern)

scripts/             One-off scripts (search indexing)
```

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

## Verification Checklist
Before committing changes:
1. Type check clean: `bun run typecheck`
2. Lint clean: `bun run lint`
3. Changed files have proper Devanagari rendering if applicable
4. SEO metadata updated for new public pages
5. Accessibility attributes present for interactive elements
6. Editorial review flag (`reviewed: Boolean`) set correctly for content changes
