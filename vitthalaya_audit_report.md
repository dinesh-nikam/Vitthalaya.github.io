# Vitthalaya (Digital Pandharpur) — Ultimate Codebase Audit & Architecture Review

Prepared by Antigravity IDE pair-programming agent team: CTO, Principal Solution Architect, Distinguished Software Engineer, Principal Frontend/Backend Engineers, Principal Database/DevOps/Security/Performance Engineers, UX Director, Search/AI/Data Engineers, and Accessibility Expert.

---

## Executive Summary & Production Readiness Dashboard

After conducting a deep-dive, zero-trust audit of the Vitthalaya codebase (tracing routes, components, schemas, configurations, and testing suites), we have compiled this comprehensive report.

### Core Executive Scores
* **Overall Production Readiness Score:** **65 / 100** (Downgraded from 88 due to SQLite client shim model omissions, SQL syntax dialect mismatches, raw SQL parameter mismatches, type-checking compilation failures, and mock test stubs).
* **Maintainability Score:** **72 / 100** (High modularity in components/ and src/ layers, but significant code rot in duplicate route files and non-functional shims).
* **Security Score:** **78 / 100** (Good CSRF protection and rate limiting implemented on API mutations, but credentials authentication tests fail out-of-the-box and token checking has fallback vulnerabilities).
* **Awwwards Design & UX Score:** **92 / 100** (Excellent native WebGL Three.js elements, conch sound synthesis, smooth scroll-progress, and highly resonant cultural color palette).
* **SEO & Accessibility Score:** **75 / 100** (Proper schema.org JSON-LD generation and responsive breakpoints, but lacking user prefers-reduced-motion check integrations in multiple interactive 3D components and keyboard-focus locking).

---

## PHASE 1: CODEBASE DISCOVERY & RESPONSIBILITY MAP

### Folder Responsibility Matrix
* **`app/`**: Next.js 15 App Router pages and REST API routes. Manages routing, page rendering, server-side data fetching, and NextAuth endpoints.
* **`components/`**: Modular React UI components. Separated into layout components, interactive audio/video players, and a sub-folder `3d/` containing custom Three.js canvasses.
* **`src/`**: Centralized domain services layer:
  * `ai-enrichment/`: Provider-agnostic LLM client support (Groq, Gemini, Ollama) and queue system.
  * `book-generation/`: Curation and PDF/EPUB export orchestration for e-commerce publishing.
  * `canonical/`: Classical Devanagari text normalization and fuzzy similarity matching (Levenshtein, Jaccard, Trigrams).
  * `db/`: Database access clients (resilient wrapper proxy, PostgreSQL singleton, and custom SQLite client shim).
  * `discovery/`: Automated scraper scheduling, crawler registry, and source trust scoring.
  * `knowledge-graph/`: Graph relationship ontology, edge traversals, and shortest path calculations.
* **`scripts/`**: Development utilities, data reseeding, search index builds, and smoke verification tests.
* **`tests/`**: Unit tests (`tests/unit`), integration tests (`tests/integration`), and Playwright browser scripts (`tests/e2e`).
* **`prisma/`**: Database schema files, migrations, and custom partitioning definitions.

### Project Directory Tree
```
Vitthalaya Root/
├── app/                        # Next.js App Router Pages & APIs
│   ├── api/                    # REST API Endpoint routes
│   ├── saints/                 # Saints directory index (Active)
│   ├── sant/                   # Saint detail pages (Active details, redirecting index)
│   ├── category/               # Category detail pages (Active details, redirecting index)
│   ├── explore/                # Exploratory landing index page
│   ├── wari/                   # Virtual Pilgrimage progress map
│   ├── graph/                  # vis-network 3D knowledge graph explorer
│   └── globals.css             # Main styling entry point
├── components/                 # React UI components
│   ├── 3d/                     # Three.js 3D Viewers (Temple, Bell, Deepak, Palkhi)
│   ├── vitthalaya-pilgrimage   # Main home page component
│   └── v4-page-shell           # Global page styling wrapper
├── src/                        # Central business logic libraries
│   ├── ai-enrichment/          # AI pipeline, Free LLM providers, queues
│   ├── book-generation/        # Book commerce generators & exporters
│   ├── canonical/              # Deduplication engine & normalizers
│   ├── db/                     # Prisma clients & SQLite shim
│   └── knowledge-graph/        # Graph relationship engines
├── scripts/                    # Database, sealing, and indexing scripts
├── tests/                      # unit, integration, and E2E suites
├── prisma/                     # schema.prisma & SQL migrations
├── package.json                # Dependencies and run scripts
└── eslint.config.js            # Permissive ESLint configuration
```

---

## PHASE 2: ARCHITECTURE & SYSTEMS STRATEGY

```
   [ Client Browser ] <─────── HTTPS/WSS ───────> [ Next.js App Router ]
           │                                                │
     (3D WebGL / PWA)                             (Auth / REST API Routes)
                                                            │
                                        ┌───────────────────┴───────────────────┐
                                        ▼                                       ▼
                              [ Resilient DB Wrapper ]                  [ Search Client ]
                                        │                                       │
                         ┌──────────────┴──────────────┐                        │
                         ▼                             ▼                        ▼
                [ Prisma Client ]             [ SQLite Shim ]           [ Meilisearch ]
                         │                             │                        │
                         ▼                             ▼                        ▼
                 [ CockroachDB ]               [ SQLite varkari.db ]      (Index / Cache)
```

1. **Authentication:** NextAuth Credentials and Google providers. Credential verification hashes passwords via PBKDF2 Sync (100K iterations in dev, 600K in prod) with SHA-512.
2. **Database & Caching:** Resilient DB wrapper proxy automatically retries queries (max 2 retries) on transient database connection/pool timeouts. Caches utilize Upstash Redis with a custom memory `Map` fallback.
3. **Search Engine:** Meilisearch with prefix autocomplete and Devanagari/Roman phonetic transliteration. Automatically falls back to PostgreSQL/SQLite fuzzy queries if Meilisearch fails.
4. **Canonical Dedup:** Standardizes Devanagari text (NFC normalization, punctuation/danda removal) and computes matching scores using Jaccard word overlap, n-gram, and line-level Levenshtein matching.
5. **AI Pipeline:** Zero-cost inference utilizing free-tier providers (Groq Llama/Mixtral, Google Gemini Flash, or local Ollama) using OpenAI-compatible endpoints.

---

## PHASE 3 & 4: FEATURE INVENTORY & IMPLEMENTATION STATUS

| Feature Name | Primary Files | Status | Implementation % | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Homepage** | `app/page.tsx`, `components/vitthalaya-pilgrimage.tsx` | 🟢 Fully Implemented | 100% | Renders 3D Vitthal scene correctly. |
| **Search** | `app/search/page.tsx`, `src/lib/search-client.ts` | 🟡 Partially Implemented | 80% | Works on PostgreSQL, but falls back to SQLite which ignores queries. |
| **Saints Mandal** | `app/saints/page.tsx`, `app/sant/[slug]/page.tsx` | 🟡 Partially Implemented | 90% | Dynamic pages work, but index page routes are mismatched. |
| **PWA / Offline** | `app/manifest.ts`, `public/sw.js` | 🟢 Fully Implemented | 100% | Offline fallback route works correctly. |
| **3D Viewers** | `components/3d/` | 🟢 Fully Implemented | 100% | WebGL rendering functions properly with animation loops. |
| **Knowledge Graph** | `app/graph/page.tsx`, `src/knowledge-graph/` | 🔴 Broken in Dev | 40% | Fails on SQLite due to raw SQL parameter syntax. |
| **Book Curation** | `src/book-generation/` | 🔴 Broken | 30% | Database insertion uses invalid field names. |
| **Worker Processing** | `app/api/workers/process/route.ts` | 🟡 Partially Implemented | 70% | Default token verification rejects dev calls. |
| **Festival Calendar** | `src/lib/festival-calculator.ts` | 🔴 Broken | 50% | Next festival calculation fails outside of date range. |
| **Test Suites** | `tests/` | ⚫ Placeholder Stubs | 20% | Most tests assert `expect(true).toBe(true)`. |

---

## PHASE 5: ROUTE AUDIT & INCONSISTENCIES

* **Index vs. Details Namespace Mismatch:**
  * Saints Gallery: `/saints` (served by `app/saints/page.tsx`).
  * Saint Details: `/sant/[slug]` (served by `app/sant/[slug]/page.tsx`).
  * Category Gallery: `/explore` (served by `app/explore/page.tsx`).
  * Category Details: `/category/[slug]` (served by `app/category/[slug]/page.tsx`).
* **Unreachable Dead Pages:**
  * `app/sant/page.tsx` and `app/category/page.tsx` exist but are bypassed entirely because of 301 redirect definitions in the middleware.
* **Empty Directories:**
  * `app/saints/[slug]` is present in the file system but is empty. Visiting `/saints/tukaram-maharaj` returns a 404.
* **Mismatched Breadcrumbs:**
  * Saint details page breadcrumb links point back to `/sant` instead of `/saints`, forcing an unnecessary HTTP 301 redirect.

---

## PHASE 6 & 7: COMPONENTS & NAVIGATION AUDIT

* **Type Safety Failures in Reusable Shell:**
  * In `components/vitthalaya-shell.tsx`, the `stats` array is initialized to `[]` without a type signature, prompting TypeScript to type it as `never[]`. Attempting to pass stats from `/explore` or `/library` throws compilation errors.
* **Tiro Devanagari Marathi Font Configuration:**
  * Next.js Google font loader requires a `weight` for `Tiro_Devanagari_Marathi`. It is configured correctly in `app/layout.tsx` but is missing in `components/vitthalaya-shell.tsx`, breaking `bun run typecheck`.
* **WebGL Interaction Lack of Reduced Motion Setting in Bell:**
  * Toggling user OS reduced motion stops auto-rotation in `TempleViewer` and `DeepakViewer`, but the damping swing animation in `BellViewer` still activates on click.

---

## PHASE 9: DATABASE AUDIT

* **SQLite Client Shim Omissions (`src/db/client-sqlite.ts`):**
  * Missing Models: `bookPublication`, `bookEdition`, `bookComposition`, `userCollection`, `uploadedFile`, `analyticsEvent`, etc.
  * Attempting to query these models (e.g. `db.bookPublication.count()`) in development when `DATABASE_URL` is empty throws a critical database client proxy error.
* **SQLite parameter filtering bypass:**
  * The `findMany` method on `composition` inside `client-sqlite.ts` ignores the `where` parameter completely. Queries requesting specific saints or types return the entire list of 50 compositions regardless of criteria.
* **Raw SQL dialect differences:**
  * `relationship-engine.ts` uses `$executeRawUnsafe` with PostgreSQL positional variables (`$1`, `$2`), which are unsupported by SQLite. Furthermore, the SQLite shim lacks `$executeRawUnsafe` altogether.

---

## PHASE 17 & 21: SECURITY & DEVOPS AUDIT

* **Failed Worker Authentication in Development:**
  * `app/api/workers/process/route.ts` compares the auth token to `process.env.WORKER_SECRET_KEY` (defaulting to `''`). The security test script sends `'dev-worker-secret'`, resulting in a 401 Unauthorized block.
* **Mock API Tests:**
  * Search endpoint tests are mocked inside the test files. They assert responses on hardcoded mocks rather than validating route handler outputs.

---

## PHASE 24: BUG REPORT & PRIORITIZED REMEDIATION ROADMAP

### 1. [CRITICAL] Home Page Crash in Development
* **Root Cause:** Home page calls `db.bookPublication.count()`. The SQLite client shim lacks `bookPublication`.
* **Affected Files:** [client-sqlite.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/db/client-sqlite.ts)
* **Fix:** Add a dummy count/find handler for `bookPublication` in `client-sqlite.ts`.
* **Effort:** 10 mins (Priority: 1)

### 2. [CRITICAL] TypeScript Compile Failures
* **Root Cause:** `Tiro_Devanagari_Marathi` missing weight config and `stats` typed as `never[]`.
* **Affected Files:** [vitthalaya-shell.tsx](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/components/vitthalaya-shell.tsx)
* **Fix:** Add `weight: "400"` to Tiro font configuration. Specify explicit `stats` type: `stats?: { label: string; value: string | number }[]`.
* **Effort:** 10 mins (Priority: 2)

### 3. [HIGH] SQLite query filter ignore
* **Root Cause:** `composition.findMany` in `client-sqlite.ts` has no WHERE compiler clause.
* **Affected Files:** [client-sqlite.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/db/client-sqlite.ts)
* **Fix:** Implement basic SQLite WHERE parser for `saintId` and `type` queries.
* **Effort:** 30 mins (Priority: 3)

### 4. [HIGH] Graph Explorer SQL Dialect Crash
* **Root Cause:** Raw SQL queries in `relationship-engine.ts` use `$1` placeholders and `$executeRawUnsafe` unsupported by SQLite.
* **Affected Files:** [relationship-engine.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/knowledge-graph/relationship-engine.ts), [client-sqlite.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/db/client-sqlite.ts)
* **Fix:** Convert queries to conditional statements, replacing `$1` with SQLite `?` binding placeholders, and expose `$executeRawUnsafe` on the SQLite client.
* **Effort:** 40 mins (Priority: 4)

### 5. [HIGH] Book Generation Database Schema Violation
* **Root Cause:** `book-generator.ts` inserts `curationCriteria` while Prisma schema expects `curationConfig`.
* **Affected Files:** [book-generator.ts](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/book-generation/book-generator.ts)
* **Fix:** Map `curationCriteria` to `curationConfig: JSON.stringify(request.curationCriteria)` before inserting.
* **Effort:** 10 mins (Priority: 5)

---

## PHASE 25: ARCHITECTURAL RECOMMENDATIONS

1. **Unify Saint and Category Routing namespaces:**
   * Rename `/sant/[slug]` to `/saints/[slug]` and `/category/[slug]` to `/explore/[slug]` or `/categories/[slug]`. Remove dynamic redirects from middleware to simplify crawlers indexation.
2. **Upgrade SQLite Client Shim:**
   * Build a dynamic query analyzer in `client-sqlite.ts` that handles basic WHERE criteria and JSON mappings dynamically instead of hardcoding model properties.
3. **Upgrade Testing Suite:**
   * Replace dummy `expect(true).toBe(true)` stubs with real integration tests that utilize a local in-memory SQLite database instance.
