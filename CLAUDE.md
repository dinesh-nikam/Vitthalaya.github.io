# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- Install dependencies: `bun install`
- Development server: `bun dev`
- Build for production: `bun build`
- Lint code: `bun lint`
- Type check: `bun typecheck`
- Run tests: `bun test`
- Run a single test: `bun test src/**/your_test_file.test.ts`
- Database generate: `bun run db:generate`
- Database migrate: `bun run db:migrate`
- Database seed: `bun run db:seed`
- Scrape content (dry‑run): `bun run scrape --dry-run --source=all --limit=5`
- Scrape content (full): `bun run scrape --source=tukaram-gatha --limit=50`

## High‑Level Architecture

- **Frontend**: Next.js 15 (App Router) with React 19 and Tailwind CSS
- **Database**: PostgreSQL accessed via Prisma ORM
- **Search**: Meilisearch with Devanagari and transliteration support
- **Hosting**: Deployed to Vercel or Cloudflare Pages (edge caching)
- **Design System**:
  - **Colors**: Saffron `#FF7A1A`, Deep Maroon `#6B1E1E`, Temple Gold `#C9A227`, Secondary Cream `#FFF8EC`, Light Sand `#F2E8D8`, Accent Peacock Blue `#1B6E8C`, Tulsi Green `#3E6B3E`
  - **Typography**: Noto Sans Devanagari + Tiro Devanagari Marathi for Devanagari; Inter for Latin scripts; line‑height 1.7–1.8
  - **Animation Principles**: Subtle, spiritual, cultural; respect `prefers-reduced-motion`; no gamification
- **Content Pipeline**: Manual editorial entry, OCR ingestion, government archive sources, deduplication, editorial approval, publishing. An automated ethical scraping pipeline respects `robots.txt`, rate limits (≤1 request per 2 seconds with jitter), stores source attribution, and includes manual review before publishing.

## Important README Excerpts

- **Tech Stack** (lines 46‑51): Next.js 15 (App Router), React 19, Tailwind CSS, PostgreSQL via Prisma ORM, Meilisearch, Vercel/Cloudflare hosting.
- **Design System** (lines 27‑45): Color palette, typography, animation principles.
- **Development** (lines 93‑111): Install, dev server, DB setup, seeding, scraping commands.
- **Pages** (lines 113‑119): Home, search, composition detail, saint hub, category, festival pages.
- **Cultural Notes** (lines 121‑128): Emphasis on sacredness, accessibility, cultural authenticity, spiritual reverence.

## Cursor / Copilot Rules

No `.cursor/rules/` or `.cursorrules` files were found. No `.github/copilot-instructions.md` was present, so no special rules need to be included.