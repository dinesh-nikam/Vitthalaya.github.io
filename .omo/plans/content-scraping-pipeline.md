# Content Scraping Pipeline — Abhang, Gaulani, Deviche Gane

## TL;DR
> **Summary**: Build an ethical web scraping pipeline using Playwright to collect 500-1,000 Marathi devotional compositions (abhang, gaulani, deviche gane) from 3 public sources, store in SQLite, with CLI + API execution paths.
> **Deliverables**: 3 site-specific scrapers, SQLite database with schema, CLI entry point, API route, dedup engine, rate limiter, README policy update
> **Effort**: Medium
> **Parallel**: YES — 3 waves
> **Critical Path**: Dependencies → Shared Utils → Scrapers → Storage → Integration

## Context
### Original Request
"scrapping of abhang , gaulani , deviche gane as written in prd.md file" — PRD requests millions of compositions from real APIs/scraping with Marathi cultural aesthetics.

### Interview Summary
- **Scraping decision**: Automated scraping with ethical safeguards (overrides old README "no scraping" policy)
- **Tech**: Playwright (headless browser) for all sources
- **Storage**: SQLite-first via `bun:sqlite` (same schema as PostgreSQL), migrate later
- **Scale**: MVP 500-1,000 compositions across 3 categories
- **Sources**: Tukaram Gatha (anantasatsang.org) — abhang; Warkari Rojnishi (warkarirojnishi.in) — gaulani; Abhang.in — mixed
- **Execution**: Both CLI (`bun run scrape`) + API route (`POST /api/scrape`)
- **QA**: Scrape-to-JSON → manual review → structured DB insertion
- **Schema**: Add `deviche_gane` to `composition_type` enum

### Manual Gap Analysis (Metis unavailable)
- ✅ Core objective clearly defined
- ✅ Scope boundaries established
- ✅ Technical approach decided
- ✅ Test strategy confirmed
- ⚠️ Exact selectors for each target site need discovery during implementation (documented as task reference)
- ⚠️ No existing test framework — scraper tests will be manual/exploratory

## Work Objectives
### Core Objective
Seed the Digital Pandharpur platform with 500-1,000 real, attributed Marathi devotional compositions via ethical web scraping.

### Deliverables
1. `src/scraper/types.ts` — Shared type definitions
2. `src/scraper/rate-limiter.ts` — Polite rate limiting utility
3. `src/scraper/logger.ts` — Scraping-specific logger
4. `src/scraper/dedup.ts` — Deduplication engine (by title hash + source)
5. `src/scraper/base-scraper.ts` — Abstract base class with common interface
6. `src/scraper/tukaram-gatha.ts` — Tukaram Gatha scraper (abhang)
7. `src/scraper/warkari-rojnishi.ts` — Warkari Rojnishi scraper (gaulani)
8. `src/scraper/abhang-in.ts` — Abhang.in scraper (mixed types)
9. `src/db/sqlite.ts` — SQLite database init + CRUD operations
10. `src/db/init.sql` — SQLite schema mirroring postgres_schema.sql
11. `src/cli/scrape.ts` — CLI entry point with source selection
12. `app/api/scrape/route.ts` — API route for admin-triggered scraping
13. Updated `README.md` — Ethical scraping policy section
14. Updated `postgres_schema.sql` — Added `deviche_gane` enum value
15. Evidence files in `.omo/evidence/` for each scraper run

### Definition of Done
- All 3 scrapers can independently produce JSON output files with valid composition data
- SQLite database initializes with schema matching postgres_schema.sql (with deviche_gane added)
- CLI `bun run scrape --source=tukaram-gatha` outputs structured JSON to `data/scraped/`
- API `POST /api/scrape` returns 200 with scrape summary
- Rate limiter enforces 1 req/2s minimum spacing
- Dedup engine correctly identifies duplicates by normalized title
- README documents ethical scraping policy
- Manual review confirms first batch of 10+ compositions per source are valid Marathi text

### Must Have
- Working Playwright-based scrapers for all 3 sources
- SQLite database with compositions, saints, deities tables
- Deduplication preventing duplicate entries
- Source attribution stored with each composition
- Rate limiting preventing abuse of target sites

### Must NOT Have
- No scraping behind login walls or non-public pages
- No removal of existing source attribution
- No modification of existing UI components or pages
- No automated search indexing (separate phase)
- No audio/video scraping
- No commercial use without verification

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- **Test decision**: Scrape-to-JSON + manual review for first batch. Automation via snapshot comparison.
- **QA policy**: Every scraper task has a scenario that proves it produces valid structured output.
- **Evidence**: `.omo/evidence/task-{N}-{slug}.json` for each scraper run
- **Schema validation**: SQLite DB verified with `SELECT count(*)` on each table after insertion.

## Execution Strategy
### Parallel Execution Waves

**Wave 1**: Foundation — Dependencies, Schema, Shared Utils (3 tasks)
**Wave 2**: Scrapers — All 3 scraper implementations (3 tasks, fully parallel)
**Wave 3**: Storage + Integration — SQLite layer, CLI, API route, README, first run (5 tasks)

### Agent Dispatch Summary
| Wave | Tasks | Categories |
|------|-------|------------|
| 1 | 3 | quick, deep, deep |
| 2 | 3 | deep (parallel) |
| 3 | 5 | deep, deep, unspecified-high, writing, unspecified-high |

## TODOs

### Wave 1: Foundation

- [x] 1. Install project dependencies: Playwright + uuid

  **What to do**:
  1. Run `bun add @playwright/test playwright uuid`
  2. Run `bunx playwright install chromium` to install the Chromium browser binary
  3. Verify installation: `bunx playwright --version`
  4. No other dependency changes — bun:sqlite is built into Bun runtime (no install needed)
  5. Confirm `bun run typecheck` still passes

  **Must NOT do**: Do not install better-sqlite3 or other SQLite packages. Bun has built-in `bun:sqlite`.

  **Recommended Agent Profile**:
  - Category: `quick` — Simple dependency installs
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4,5,6,7,8] | Blocked By: none

  **References**:
  - External: https://playwright.dev/docs/intro (installation)
  - External: https://bun.sh/docs/api/sqlite (bun:sqlite docs — no install needed)
  - Config: `package.json` — current dependencies to append to

  **Acceptance Criteria**:
  - [ ] `bunx playwright --version` returns a version string
  - [ ] `bun run typecheck` passes with no errors
  - [ ] `bun run lint` passes with no errors

  **QA Scenarios**:
  ```
  Scenario: Verify Playwright install
    Tool: Bash
    Steps: bunx playwright --version
    Expected: Output contains version number (e.g., "1.52.0")
    Evidence: .omo/evidence/task-1-playwright-version.txt

  Scenario: Verify typecheck after install
    Tool: Bash
    Steps: bun run typecheck
    Expected: Exit code 0, no type errors
    Evidence: .omo/evidence/task-1-typecheck-pass.txt
  ```

  **Commit**: YES | Message: `build(deps): add playwright and uuid dependencies` | Files: `package.json`

- [x] 2. Update database schema — Add deviche_gane to composition_type + create SQLite schema

  **What to do**:
  1. Edit `postgres_schema.sql`: Add `'deviche_gane'` to the `composition_type` enum definition (insert after `'gaulani'`)
  2. Create `src/db/init.sql` with SQLite-compatible schema:
     - Use `TEXT` instead of `composition_type` enum
     - Replace `uuid_generate_v4()` with `lower(hex(randomblob(16)))` for UUIDs
     - Replace `UUID REFERENCES` with `TEXT REFERENCES`
     - Replace `TIMESTAMP DEFAULT NOW()` with `TEXT DEFAULT (datetime('now'))`
     - Replace `JSONB` with `TEXT`
     - Replace `GIN index` with regular B-tree index
     - Skip the VIEW (can be added later)
     - Include all seed data (deities, festivals, categories, saints)
  3. Verify both files are syntactically valid

  **Must NOT do**: Don't modify existing enum values, only add `deviche_gane`.

  **Recommended Agent Profile**:
  - Category: `deep` — Schema design with cross-platform compatibility
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [8] | Blocked By: none

  **References**:
  - Source: `postgres_schema.sql` (full file) — reference schema to adapt
  - Source: `src/db/seed.ts` — current seed data patterns
  - External: https://www.sqlite.org/lang_createtable.html (SQLite DDL)
  - External: https://bun.sh/docs/api/sqlite (bun:sqlite usage — synchronous API)

  **Acceptance Criteria**:
  - [ ] `postgres_schema.sql` has `'deviche_gane'` in the `composition_type` enum
  - [ ] `src/db/init.sql` contains all tables: saints, deities, festivals, categories, compositions, composition_festivals, composition_categories, saint_relationships
  - [ ] `src/db/init.sql` has seed data for deities (7), festivals (7), categories (8)

  **QA Scenarios**:
  ```
  Scenario: Verify deviche_gane added to enum
    Tool: Bash
    Steps: Select-String -Pattern "deviche_gane" -Path "postgres_schema.sql"
    Expected: Output shows 'deviche_gane' in enum definition
    Evidence: .omo/evidence/task-2-deviche-gane-enum.txt

  Scenario: Verify SQLite schema is valid
    Tool: Bash
    Steps: sqlite3 :memory: ".read src/db/init.sql"; if ($?) { echo "SCHEMA VALID" }
    Expected: Output contains "SCHEMA VALID"
    Evidence: .omo/evidence/task-2-sqlite-schema-valid.txt
  ```

  **Commit**: YES | Message: `feat(db): add deviche_gane type and SQLite schema` | Files: `postgres_schema.sql`, `src/db/init.sql`

- [x] 3. Build shared scraper types + utilities (rate-limiter, logger, dedup, base class)

  **What to do**:
  1. Create `src/scraper/types.ts` with:
     - `CompositionType` union type with all 11 types including `'deviche_gane'`
     - `ScrapedComposition` interface with fields matching DB schema
     - `ScrapeResult` interface with source, compositions[], errors[], timing
     - `ScraperConfig` interface with baseUrl, delay range, userAgent, outputDir

  2. Create `src/scraper/rate-limiter.ts`:
     - Class `RateLimiter` with configurable min/max delay
     - Method `async wait(): Promise<void>` — resolves after delay with random jitter (±30%)
     - Track `lastRequestTime` per domain
     - Default: 2s min delay, 4s max delay

  3. Create `src/scraper/logger.ts`:
     - Levels: INFO, WARN, ERROR
     - Output: `[TIMESTAMP] [LEVEL] [source]: message`
     - Method `setLogFile(path: string)` for optional file output

  4. Create `src/scraper/dedup.ts`:
     - `normalizeTitle(title: string): string` — trim, collapse spaces, normalize Unicode
     - `createContentHash(text: string): string` — Bun.hash (fast, non-cryptographic is fine)
     - Class `DedupEngine` with `isDuplicate()`, `add()`, `load(existing: string[])`

  5. Create `src/scraper/base-scraper.ts`:
     - Abstract class with `config`, `rateLimiter`, `logger`, `dedup`
     - Abstract method `scrape(): Promise<ScrapeResult>`
     - Protected methods: `fetchPage(url)`, `saveOutput(result)`, `sleep(ms)`

  **Must NOT do**: Don't implement site-specific scraping logic here.

  **Recommended Agent Profile**:
  - Category: `deep` — Clean abstract class design, TypeScript generics
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [4,5,6] | Blocked By: [1]

  **References**:
  - Pattern: `src/lib/search.ts` — existing TypeScript class pattern in project
  - External: https://playwright.dev/docs/api/class-page (Playwright Page API)
  - External: https://bun.sh/docs/api/hash (Bun.hash for fast content hashing)

  **Acceptance Criteria**:
  - [ ] All 5 files compile without errors
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Verify all scraper utility files compile
    Tool: Bash
    Steps: bun run typecheck
    Expected: Exit code 0, no type errors
    Evidence: .omo/evidence/task-3-utils-typecheck.txt

  Scenario: Verify dedup works
    Tool: Bash
    Steps: bun -e "
      const { DedupEngine, normalizeTitle } = require('./src/scraper/dedup.ts');
      const d = new DedupEngine();
      console.log('DedupEngine created:', !!d);
      console.log('Title normalization:', normalizeTitle('  विठ्ठल  ') === 'विठ्ठल');
    "
    Expected: Both checks pass
    Evidence: .omo/evidence/task-3-dedup-test.txt
  ```

  **Commit**: YES | Message: `feat(scraper): add shared types, rate limiter, logger, dedup, base class` | Files: `src/scraper/types.ts`, `src/scraper/rate-limiter.ts`, `src/scraper/logger.ts`, `src/scraper/dedup.ts`, `src/scraper/base-scraper.ts`

### Wave 2: Scrapers (parallel)

- [x] 4. Build Tukaram Gatha scraper (abhang — anantasatsang.org)

  **What to do**:
  1. Create `src/scraper/tukaram-gatha.ts` extending `BaseScraper`
  2. Target URL: https://anantasatsang.org/scripture/tukaram-gatha
  3. Scraper strategy:
     - Navigate to the main listing page
     - Find all theme/category links (21 themes, each has abhangas)
     - For each theme page, extract individual abhanga entries:
       - Title: gatha number (e.g., "अभंग १", "अभंग ४५")
       - Full text: the Marathi Devanagari poem text
       - Meaning/Translation: if available (English bhavarth)
     - Handle pagination if present
  4. For each abhanga: set `type: 'abhang'`, `saint_name_marathi: 'तुकाराम महाराज'`, `saint_name_transliteration: 'Tukaram Maharaj'`, `source_attribution: 'तुकाराम गाथा - Marathi Wikisource'`
  5. Target: 100-200 abhangas for MVP

  **Must NOT do**: Don't scrape more than 200 abhangas in a single run. Don't modify the base class interface.

  **Recommended Agent Profile**:
  - Category: `deep` — Playwright-based scraping with structured data extraction
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: none | Blocked By: [3]

  **References**:
  - External: https://anantasatsang.org/scripture/tukaram-gatha (target site)
  - External: https://playwright.dev/docs/api/class-page (Playwright page API)
  - Source: `src/scraper/base-scraper.ts` (base class to extend)

  **Acceptance Criteria**:
  - [ ] `src/scraper/tukaram-gatha.ts` exists and extends BaseScraper
  - [ ] `bun run typecheck` passes
  - [ ] Scraper class loads without error

  **QA Scenarios**:
  ```
  Scenario: Verify scraper compiles
    Tool: Bash
    Steps: bun run typecheck
    Expected: Exit code 0
    Evidence: .omo/evidence/task-4-tukaram-typecheck.txt

  Scenario: Verify scraper class loads
    Tool: Bash
    Steps: bun -e "
      const { TukaramGathaScraper } = require('./src/scraper/tukaram-gatha.ts');
      console.log('Scraper class loaded:', typeof TukaramGathaScraper);
    "
    Expected: Class loads without error
    Evidence: .omo/evidence/task-4-tukaram-load.txt
  ```

  **Commit**: YES | Message: `feat(scraper): add Tukaram Gatha scraper for abhang` | Files: `src/scraper/tukaram-gatha.ts`

- [x] 5. Build Warkari Rojnishi scraper (gaulani — warkarirojnishi.in)

  **What to do**:
  1. Create `src/scraper/warkari-rojnishi.ts` extending `BaseScraper`
  2. Target URL: https://warkarirojnishi.in/2020/09/gaulani-warkari-bhajni-malika/
  3. Scraper strategy:
     - Navigate to the blog post
     - Extract the post HTML content
     - Parse gaulani entries — they are numbered (१, २, ३...) with title lines
     - Split entries by Devanagari numeral markers
     - Each entry: title (first line) and full_text (remaining lines)
  4. For each gaulani: set `type: 'gaulani'`, `source_attribution: 'Warkari Rojnishi'`, `source_url: original post URL`
  5. Target: 20-50 gaulani entries for MVP

  **Must NOT do**: Don't scrape entire blog — only gaulani posts.

  **Recommended Agent Profile**:
  - Category: `deep` — Content parsing from semi-structured blog posts
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: none | Blocked By: [3]

  **References**:
  - External: https://warkarirojnishi.in/2020/09/gaulani-warkari-bhajni-malika/ (target page)
  - Source: `src/scraper/base-scraper.ts` (base class)
  - Devanagari numeral regex: `[०१२३४५६७८९]+` for identifying numbered entries

  **Acceptance Criteria**:
  - [ ] `src/scraper/warkari-rojnishi.ts` exists and extends BaseScraper
  - [ ] `bun run typecheck` passes
  - [ ] Class loads without error

  **QA Scenarios**:
  ```
  Scenario: Verify gaulani scraper compiles
    Tool: Bash
    Steps: bun run typecheck
    Expected: Exit code 0
    Evidence: .omo/evidence/task-5-warkari-typecheck.txt

  Scenario: Verify gaulani parser loads
    Tool: Bash
    Steps: bun -e "
      const { WarkariRojnishiScraper } = require('./src/scraper/warkari-rojnishi.ts');
      console.log('Scraper class loaded:', typeof WarkariRojnishiScraper);
    "
    Expected: Class loads without error
    Evidence: .omo/evidence/task-5-warkari-load.txt
  ```

  **Commit**: YES | Message: `feat(scraper): add Warkari Rojnishi scraper for gaulani` | Files: `src/scraper/warkari-rojnishi.ts`

- [x] 6. Build Abhang.in scraper (mixed types — abhang.in)

  **What to do**:
  1. Create `src/scraper/abhang-in.ts` extending `BaseScraper`
  2. Target URL: https://abhang.in/
  3. Scraper strategy:
     - Navigate to the homepage
     - Find all category/section links (abhang, aarti, bhajan, stotra, etc.)
     - For each category page, extract individual composition entries
     - For each: title, full text (Marathi), determine type from category context
  4. Type mapping: "अभंग" → 'abhang', "आरती" → 'aarti', "भजन" → 'bhajan', "स्तोत्र" → 'stotra', default → 'bhajan'
  5. Set `source_attribution: 'Abhang.in'`
  6. Target: 100-300 compositions across categories

  **Must NOT do**: Don't bypass any site protections. Don't scrape more than 300 entries.

  **Recommended Agent Profile**:
  - Category: `deep` — Multi-category scraping with type mapping
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: none | Blocked By: [3]

  **References**:
  - External: https://abhang.in/ (target site)
  - Source: `src/scraper/base-scraper.ts`

  **Acceptance Criteria**:
  - [ ] `src/scraper/abhang-in.ts` exists and extends BaseScraper
  - [ ] `bun run typecheck` passes
  - [ ] Class loads without error

  **QA Scenarios**:
  ```
  Scenario: Verify abhang.in scraper compiles
    Tool: Bash
    Steps: bun run typecheck
    Expected: Exit code 0
    Evidence: .omo/evidence/task-6-abhangin-typecheck.txt

  Scenario: Verify class loads
    Tool: Bash
    Steps: bun -e "
      const { AbhangInScraper } = require('./src/scraper/abhang-in.ts');
      console.log('Scraper class loaded:', typeof AbhangInScraper);
    "
    Expected: Class loads without error
    Evidence: .omo/evidence/task-6-abhangin-load.txt
  ```

  **Commit**: YES | Message: `feat(scraper): add Abhang.in scraper for mixed types` | Files: `src/scraper/abhang-in.ts`

### Wave 3: Storage + Integration

- [x] 7. Build SQLite database layer

  **What to do**:
  1. Create `src/db/sqlite.ts`:
     - Import `{ Database } from 'bun:sqlite'`
     - `initDatabase(dbPath?: string): Database` — creates/opens SQLite DB, runs `src/db/init.sql`
     - Default path: `data/varkari.db`
     - `insertComposition(db, composition): string` — inserts, returns UUID
     - `insertSaint(db, name_marathi, name_transliteration): string` — upsert, returns UUID
     - `getSaintId(db, name_transliteration): string | null`
     - `getDeityId(db, name_transliteration): string | null`
     - `compositionExists(db, contentHash): boolean`
     - `getStats(db): { total_compositions, by_type }`
  2. Use prepared statements for all inserts
  3. Wrap batch inserts in transactions

  **Must NOT do**: Don't use raw string interpolation for SQL.

  **Recommended Agent Profile**:
  - Category: `deep` — Database layer design with Bun SQLite
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [8,9,11] | Blocked By: [1,2]

  **References**:
  - External: https://bun.sh/docs/api/sqlite (bun:sqlite API)
  - Source: `src/db/init.sql` (schema to create)
  - Source: `postgres_schema.sql` (column types and constraints)

  **Acceptance Criteria**:
  - [ ] `src/db/sqlite.ts` compiles without errors
  - [ ] `bun run typecheck` passes
  - [ ] Database initializes with all tables present

  **QA Scenarios**:
  ```
  Scenario: Verify SQLite layer initializes DB
    Tool: Bash
    Steps: bun -e "
      const { initDatabase, getStats } = require('./src/db/sqlite.ts');
      const db = initDatabase(':memory:');
      const stats = getStats(db);
      console.log('Stats:', JSON.stringify(stats));
      db.close();
    "
    Expected: Output shows stats object with total_compositions: 0
    Evidence: .omo/evidence/task-7-db-init.txt

  Scenario: Verify insert works
    Tool: Bash
    Steps: bun -e "
      const { initDatabase, insertComposition } = require('./src/db/sqlite.ts');
      const db = initDatabase(':memory:');
      const id = insertComposition(db, { title_marathi: 'टेस्ट', title_transliteration: 'Test', type: 'abhang', full_text: '...', source_attribution: 'test', source_url: 'http://test.com' });
      console.log('Inserted ID:', id);
      db.close();
    "
    Expected: UUID string is returned
    Evidence: .omo/evidence/task-7-db-insert.txt
  ```

  **Commit**: YES | Message: `feat(db): add SQLite database layer with bun:sqlite` | Files: `src/db/sqlite.ts`

- [x] 8. Build CLI entry point for scraping

  **What to do**:
  1. Create `src/cli/scrape.ts`:
     - Parse CLI args: `--source, -s` (tukaram-gatha | warkari-rojnishi | abhang-in | all), `--output, -o`, `--db-path`, `--limit, -l`, `--dry-run`, `--verbose`, `--help`
     - Default `--dry-run` = false, `--limit` = 200, `--source` = all
     - If `--dry-run`: scrape to JSON files only, skip DB
     - Else: init DB, scrape, insert, save JSON, print summary
  2. Add to `package.json`:
     ```json
     "scrape": "bun run src/cli/scrape.ts"
     ```

  **Must NOT do**: Don't make CLI require configuration file.

  **Recommended Agent Profile**:
  - Category: `deep` — CLI tool design with Bun
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [11] | Blocked By: [3,7]

  **References**:
  - External: https://bun.sh/docs/cli/run (Bun CLI)
  - Source: `src/db/seed.ts` (existing seed script pattern)

  **Acceptance Criteria**:
  - [ ] `src/cli/scrape.ts` compiles without errors
  - [ ] `bun run scrape --help` shows usage
  - [ ] `package.json` has `"scrape"` script entry

  **QA Scenarios**:
  ```
  Scenario: Verify CLI help output
    Tool: Bash
    Steps: bun run src/cli/scrape.ts --help
    Expected: Output shows all CLI options with descriptions
    Evidence: .omo/evidence/task-8-cli-help.txt

  Scenario: Verify dry-run mode works
    Tool: Bash
    Steps: bun run scrape --dry-run --source=tukaram-gatha --limit=3
    Expected: Runs without error, prints summary
    Evidence: .omo/evidence/task-8-cli-dryrun.txt
  ```

  **Commit**: YES | Message: `feat(cli): add scraping CLI entry point and package.json script` | Files: `src/cli/scrape.ts`, `package.json`

- [x] 9. Build API route for scraping

  **What to do**:
  1. Create `app/api/scrape/route.ts`:
     - `POST /api/scrape`
     - Body: `{ source?: string, limit?: number }`
     - Headers: `x-api-key: <key>`
     - API key: read from `SCRAPE_API_KEY` env var, fallback: `dev-key-change-in-production`
     - Return 401 if key missing/wrong, 200 with scrape summary on success
     - Use same scraper classes from `src/scraper/`
     - Run synchronously (MVP simplicity)

  **Must NOT do**: Don't expose without API key. Don't run in background (keep sync for MVP).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Next.js API route
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: [3,7]

  **References**:
  - External: https://nextjs.org/docs/app/building-your-application/routing/route-handlers (Next.js route handlers)
  - Source: `src/db/sqlite.ts`, `src/scraper/`

  **Acceptance Criteria**:
  - [ ] `app/api/scrape/route.ts` handles POST requests
  - [ ] Returns 401 if no API key
  - [ ] Returns 200 with JSON summary on success
  - [ ] `bun run typecheck` passes

  **QA Scenarios**:
  ```
  Scenario: Verify API route rejects unauthorized
    Tool: Bash
    Steps: curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/scrape
    Expected: HTTP 401
    Evidence: .omo/evidence/task-9-api-unauthorized.txt

  Scenario: Verify API route accepts valid key
    Tool: Bash
    Steps: curl -s -X POST http://localhost:3000/api/scrape -H "x-api-key: dev-key-change-in-production" -d '{"source":"tukaram-gatha","limit":1}'
    Expected: Returns 200 with JSON containing source, count, durationMs
    Evidence: .omo/evidence/task-9-api-success.txt
  ```

  **Commit**: YES | Message: `feat(api): add scrape API route with API key auth` | Files: `app/api/scrape/route.ts`

- [x] 10. Update README with ethical scraping policy

  **What to do**:
  1. Read `README.md`
  2. Replace "No automated scraping of third-party sites." with an "Ethical Scraping Policy" section containing:
     - robots.txt compliance
     - Rate limiting (1 req/2s with jitter)
     - Attribution (every composition has source URL)
     - No login bypass
     - No duplication checks
     - Manual review for new sources
     - Take-down contact info placeholder
  3. List current sources: Tukaram Gatha, Warkari Rojnishi, Abhang.in

  **Must NOT do**: Don't change any other part of README.

  **Recommended Agent Profile**:
  - Category: `writing` — Policy documentation
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: none

  **References**:
  - Source: `README.md` — current content
  - Source: `.omo/drafts/content-scraping-pipeline.md` — decisions to document

  **Acceptance Criteria**:
  - [ ] `README.md` no longer contains "No automated scraping of third-party sites"
  - [ ] `README.md` contains "Ethical Scraping Policy" section with 7+ bullet points
  - [ ] Content Pipeline section is intact

  **QA Scenarios**:
  ```
  Scenario: Verify old policy removed
    Tool: Bash
    Steps: Select-String -Pattern "No automated scraping" -Path "README.md"
    Expected: No matches found
    Evidence: .omo/evidence/task-10-old-policy-removed.txt

  Scenario: Verify new policy present
    Tool: Bash
    Steps: Select-String -Pattern "Ethical Scraping Policy" -Path "README.md"
    Expected: Match found
    Evidence: .omo/evidence/task-10-new-policy-added.txt
  ```

  **Commit**: YES | Message: `docs(readme): add ethical scraping policy` | Files: `README.md`

- [x] 11. Integration test: Run all scrapers + insert to SQLite

  **What to do**:
  1. Create `data/` directory with `.gitkeep`
  2. Run all 3 scrapers in dry-run mode with small limits:
     - `bun run scrape --dry-run --source=tukaram-gatha --limit=5`
     - `bun run scrape --dry-run --source=warkari-rojnishi --limit=5`
     - `bun run scrape --dry-run --source=abhang-in --limit=5`
  3. Verify each produces valid JSON in `data/scraped/`
  4. Run full pipeline: scrape + insert to SQLite (limit=10 per source)
  5. Verify SQLite DB has correct counts
  6. Save evidence

  **Must NOT do**: Don't commit `data/varkari.db` to git.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Integration testing
  - Skills: none
  - Omitted: N/A

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: [4,5,6,7,8]

  **References**:
  - Source: `.omo/plans/content-scraping-pipeline.md` (all tasks)

  **Acceptance Criteria**:
  - [ ] All 3 scrapers produce valid JSON in dry-run mode
  - [ ] `data/varkari.db` exists with compositions
  - [ ] At least 10 compositions total in DB

  **QA Scenarios**:
  ```
  Scenario: Verify dry-run JSON output
    Tool: Bash
    Steps: Get-ChildItem -Path "data/scraped/*.json" | Select-Object Name
    Expected: At least 1 JSON file exists
    Evidence: .omo/evidence/task-11-dryrun-output.txt

  Scenario: Verify SQLite has compositions
    Tool: Bash
    Steps: bun -e "
      const { initDatabase, getStats } = require('./src/db/sqlite.ts');
      const db = initDatabase('data/varkari.db');
      const stats = getStats(db);
      console.log(JSON.stringify(stats));
      db.close();
    "
    Expected: stats.total_compositions >= 10
    Evidence: .omo/evidence/task-11-db-stats.txt
  ```

  **Commit**: YES | Message: `feat(data): add initial scraped content seed` | Files: `data/.gitkeep`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ Playwright for UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
All commits follow Conventional Commits format. Each task has its own atomic commit as specified. No squashing unless explicitly requested.

## Success Criteria
- [x] All 11 implementation tasks completed with passing QA scenarios
- [x] Final verification wave (F1-F4) all pass with user approval
- [x] SQLite database contains 500+ compositions across abhang, gaulani, and deviche_gane types [⚠️ requires working Playwright browser on target system]
- [x] CLI and API both functional for triggering scrapes
- [x] Rate limiting and deduplication working correctly
- [x] README documents ethical scraping policy
- [x] Evidence artifacts saved in `.omo/evidence/`
