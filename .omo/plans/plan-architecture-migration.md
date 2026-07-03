# Vitthalaya Architecture Migration — Implementation Plan

**Derived from**: Architecture Redesign (Phase 1: Architect)
**Total Phases**: 5 | **Total Steps**: 42 | **Parallel Batches**: 9

---

## Phase 1: Navigation Restructure
**Goal**: Implement 5-pillar navigation + new route structure without breaking existing features.
**Risk**: Low | **Duration**: ~14 steps | **Parallel batches**: 3

### Step 1.1 — Create route stubs for new top-level pages
**Files to create**:
- `app/explore/page.tsx` — Explore pillar landing
- `app/library/page.tsx` — Library pillar landing
- `app/wari/page.tsx` — Wari pillar landing
- `app/learn/page.tsx` — Learn pillar landing
- `app/community/page.tsx` — Community grouping landing
- `app/store/page.tsx` — Commerce segregation landing

**Action**: Create minimal page components with heading, description, and placeholder content. Reuse existing layout.

**Verification**: `bun run dev` → navigate to `/explore`, `/library`, `/wari`, `/learn`, `/community`, `/store` — each returns 200 with correct heading.

**Can parallelize with**: 1.2, 1.3

---

### Step 1.2 — Restructure header navigation
**File to edit**: `components/header-nav.tsx`

**Changes**:
1. Replace current flat link list with 5 primary pillar links: [Explore, Library, Saints, Wari, Learn]
2. Add search icon button (opens SearchOverlay on mobile)
3. Add community link under user dropdown (not top-level)
4. Add user avatar/profile menu
5. Keep cart icon (conditionally show on commerce pages)
6. Move admin link to user dropdown
7. Remove standalone /books, /festival links from header

**Verification**: `lsp_diagnostics` clean on file. Visual: header shows 5 tabs, user menu works.

**Dependency**: None (can parallel with 1.1)

---

### Step 1.3 — Create mobile bottom tab bar
**File to create**: `components/bottom-tab-bar.tsx`

**Changes**:
1. Fixed bottom navigation with 5 tabs: Home, Search, Library, Saints, More
2. "More" opens a drawer with: Explore, Wari, Learn, Account, Community, Store
3. Active tab highlighting
4. Hidden on desktop (`lg:hidden`)
5. Push main content up to avoid overlap (`pb-16` on body)

**Verification**: Build passes. On mobile viewport, bottom bar renders with correct icons. Each tab navigates correctly.

**Dependency**: 1.1 (routes must exist)

---

### Step 1.4 — Create SearchOverlay component (mobile)
**File to create**: `components/search-overlay.tsx`

**Changes**:
1. Full-screen overlay with SearchInput at top
2. Popular search suggestions below
3. Animate in from top
4. Triggered by search icon in header/bottom bar
5. Close on escape, backdrop tap, or submit

**Verification**: On mobile, tapping search icon opens overlay. Typing shows suggestions. Escape closes.

**Dependency**: 1.2 (header search trigger)

---

### Step 1.5 — Add 301 redirects for old URLs
**File to create**: `src/lib/route-redirects.ts`
**File to create**: `middleware.ts` (if not existing, otherwise edit)

**Redirect map**:
```
/sant/*        → /saints/*
/category      → /explore
/category/*    → /library?category=*
/collections/* → /library/collections/*
/festival/*    → /explore/festivals/*
/books         → /store/books
/cart          → /store/cart
/checkout      → /store/checkout
/orders        → /account/orders
/leaderboard   → /community
/reading-lists/* → /account/reading-lists/*
```

**Verification**: Hit each old URL — get 301 redirect to new URL. All features reachable.

**Dependency**: 1.1 (new routes must exist)

---

### Step 1.6 — Update layout to include bottom tab bar and new header
**File to edit**: `app/layout.tsx`

**Changes**:
1. Import and render `BottomTabBar` component
2. Update footer content (add statistics, about, advanced links)
3. Add `pb-16` class to body for mobile tab bar clearance

**Verification**: `lsp_diagnostics` clean. Layout renders correctly on mobile and desktop.

**Dependency**: 1.3 (bottom tab bar), 1.2 (new header)

---

### Step 1.7 — Verify all existing route redirects
**Files to check**: All existing route handlers

**Action**: Run full route inventory against redirect map. Ensure no route returns 404.

**Verification**: Script or manual check of every route in `app/` directory returns expected status.

**Dependency**: 1.5

---

## Phase 2: Homepage Redesign
**Goal**: Transform homepage from feature dump to guided experience.
**Risk**: Medium | **Duration**: ~10 steps | **Parallel batches**: 3

### Step 2.1 — Simplify HeroSection
**File to edit**: `components/hero-section.tsx`

**Changes**:
1. Keep: Brand headline, subtitle, search bar, 3D Deepak
2. Remove: The animated scrolling section indicator ("खाली स्क्रोल करा") with bounce
3. Remove: Festival banner pulse (move to CulturalHighlights section below)
4. Remove: Quick links row ("लोकप्रिय श्रेणी: विठ्ठल • हरिपाठ • आरत्या")
5. Reduce height: `min-h-screen` → `min-h-[80vh]` or `py-24`
6. Simplify BackgroundLayers (remove excessive particles, keep temple silhouette)

**Verification**: `lsp_diagnostics` clean. Visual: cleaner hero, search is the primary action, no competing links.

**Dependency**: None

---

### Step 2.2 — Extract timeline and Wari from CinematicJourney
**File to edit**: `components/cinematic-journey.tsx`

**Changes**:
1. Remove Section 2 (BIRTH OF BHAKTI timeline) — extracts to `/learn/timeline`
2. Remove Section 4 (THE WARI JOURNEY) — extracts to `/wari`
3. Rename remaining sections:
   - Section 1 (Welcome) → keep as intro
   - Section 3 (Meet the Saints) → keep as preview, link to `/saints`
   - Section 5 (Explore Categories) → keep as preview, link to `/explore`
4. Add "View Full Timeline →" link at bottom of Section 1
5. Add "Experience the Wari →" link at bottom of Section 3 area placeholder

**Verification**: `lsp_diagnostics` clean. Homepage still shows welcome + saints + categories sections. Timeline and Wari removed from home.

**Dependency**: 1.1 (must have /learn/timeline and /wari routes)

---

### Step 2.3 — Create UniversalSearch component
**File to create**: `components/universal-search.tsx`

**Changes**:
1. Full-width search bar larger than hero search
2. Type-to-suggest across all content types (saints, compositions, categories, festivals, timeline events)
3. Section label "Popular Searches" with clickable chips
4. Category filter chips below search bar
5. Debounced API calls to `/api/search/suggest?q=...`
6. Animated focus state (border glow, shadow expansion)

**Verification**: Type "तु" → instant suggestions appear from all categories. Clicking suggestion navigates correctly.

**Dependency**: Can use existing `/api/search` endpoint. No backend changes needed.

---

### Step 2.4 — Create FeaturedPaths component
**File to create**: `components/featured-paths.tsx`

**Changes**:
1. 4-card grid with icons/illustrations:
   - 📖 Read Abhangs → `/library?type=abhang`
   - 🕯️ Explore Saints → `/saints`
   - 🚩 Walk the Wari → `/wari`
   - 📜 Learn History → `/learn/timeline`
2. Each card: icon, Marathi title, short description, arrow CTA
3. Hover: subtle lift + saffron accent
4. Mobile: 2×2 grid

**Verification**: All 4 cards render. Each navigates to correct path.

**Dependency**: 1.1 (routes must exist)

---

### Step 2.5 — Create DailySpiritualExperience component
**File to create**: `components/daily-spiritual.tsx`

**Changes**:
1. 3-card row:
   - Today's Abhang (random or curated, fetched from `/api/compositions/daily`)
   - Saint of the Day (fetched from `/api/saints/daily`)
   - Daily Reflection (short verse, fetched from `/api/compositions/random`)
2. Each card: title, content preview, "Read Now" / "View Saint" CTA
3. API endpoint for daily content: `/api/daily/content` — returns {abhang, saint, reflection}
4. SSR-capable (fetch on server, pass as props)
5. Mobile: single card, swipeable

**Verification**: Homepage shows 3 daily content cards. Each links to correct detail page.

**Dependency**: 2.1 (simplified hero), API endpoint creation

### Step 2.5a — Create daily content API endpoint
**File to create**: `app/api/daily/content/route.ts`

**Changes**:
1. GET handler returning { abhang, saint, reflection }
2. Select random composition for Today's Abhang
3. Select random saint for Saint of the Day
4. Select short composition for Daily Reflection
5. Cache result for 6 hours to keep "daily" feel

**Verification**: `curl GET /api/daily/content` → returns valid JSON with 3 items.

**Dependency**: None (pure data endpoint)

---

### Step 2.6 — Create CulturalHighlights component
**File to create**: `components/cultural-highlights.tsx`

**Changes**:
1. 3 highlights from data:
   - Timeline highlight (latest century from DB)
   - Important event (current festival or season)
   - Featured collection (random featured collection)
2. Each: icon, title, short description, link
3. Styled as subtle text cards (Level 3 visual weight — medium)

**Verification**: Renders on homepage with real data from DB.

**Dependency**: None

---

### Step 2.7 — Move statistics to Footer
**File to edit**: `app/layout.tsx`

**Changes**:
1. Update footer section with statistics grid:
   - Total saints count
   - Total compositions count
   - 3D experiences count
   - Archive metrics
2. Add footer links: About Project, Research Info, Knowledge Graph, Admin
3. Style: muted text, small icons, 4-column grid

**Verification**: Footer shows statistics + advanced links. No statistics remain in main content.

**Dependency**: None

---

### Step 2.8 — Rebuild HomePage server component
**File to edit**: `app/page.tsx`

**Changes**:
1. Import new components: UniversalSearch, FeaturedPaths, DailySpiritual, CulturalHighlights
2. Keep saints and categories data fetching (still needed for DailySpiritual and CulturalHighlights)
3. Remove CinematicJourney import (after extraction in 2.2)
4. New page structure in order:
   - HeroSection (simplified)
   - UniversalSearch (dominant)
   - ContinueJourney (conditionally rendered for logged-in users)
   - FeaturedPaths
   - DailySpiritualExperience
   - CulturalHighlights
5. Remove `export const dynamic = 'force-dynamic'` (re-evaluate)

**Verification**: Homepage renders all 6 sections in order. Each section functions correctly. Build passes.

**Dependency**: 2.1 (simplified hero), 2.2 (extracted CinematicJourney), 2.3-2.6 (new components)

---

## Phase 3: Content Reorganization
**Goal**: Reshuffle content into new pillar structure without data loss.
**Risk**: Medium | **Duration**: ~8 steps | **Parallel batches**: 3

### Step 3.1 — Build /explore landing page
**File to edit**: `app/explore/page.tsx`

**Changes**:
1. Featured Content section (call `/api/recommendations/featured`)
2. Popular Abhangs section (call `/api/search?sort=popular`)
3. Categories grid (reuse existing `CategoryGrid` logic from CinematicJourney)
4. Collections list
5. Festival highlights (current/upcoming)

**Verification**: `/explore` shows all 5 sections with real data. Each item links correctly.

**Dependency**: 1.1 (route exists)

---

### Step 3.2 — Build /library page with type-based filtering
**File to edit**: `app/library/page.tsx`

**Changes**:
1. Sub-navigation tabs: [All, Abhangs, Aartis, Stotras, Bhajans, Collections]
2. Default: "All" — shows mixed content grid
3. Type tabs filter by `composition.type` (existing DB field)
4. Reuse `SearchResultsList` component for results
5. Collections tab shows collection cards (existing data)

**Verification**: `/library` renders with tabs. Clicking "Aartis" filters to only aarti compositions.

**Dependency**: 1.1

---

### Step 3.3 — Move commerce routes under /store
**Files to create/update**:
- `app/store/books/page.tsx` (from `app/books/page.tsx`)
- `app/store/cart/page.tsx` (from `app/cart/page.tsx`)
- `app/store/checkout/page.tsx` (from `app/checkout/page.tsx`)
- `app/store/gift/page.tsx` (from `app/gift/page.tsx`)
- `app/books/[slug]/page.tsx` → `app/store/books/[slug]/page.tsx`

**Action**: Create new route files that re-export the old page content. Then add 301 redirects.

**Alternative approach** (simpler, preferred): Add middleware rewriting so `/books` → `/store/books` transparently, then later migrate actual files.

**Verification**: `/store/books` returns same content as `/books`. `/books` redirects to `/store/books`.

**Dependency**: 1.5 (redirect infrastructure)

---

### Step 3.4 — Build /community page
**File to edit**: `app/community/page.tsx`

**Changes**:
1. Leaderboard section (import from `app/leaderboard/page.tsx`)
2. Corrections section (link to existing correction-panel)
3. Version History section
4. Simple tabbed layout

**Verification**: `/community` shows leaderboard + corrections links.

**Dependency**: 1.1

---

### Step 3.5 — Update /sant to /saints with redirect
**File to create**: `app/saints/page.tsx`

**Action**:
1. Create `/saints/page.tsx` with same content as `/sant/page.tsx`
2. Add 301 redirect from `/sant` → `/saints`
3. Update all internal links pointing to `/sant/*` → `/saints/*`

**Verification**: `/saints` renders correctly. `/sant` redirects to `/saints`.

**Dependency**: 1.5

---

### Step 3.6 — Create /account/reading-lists redirect
**File to create**: `app/account/reading-lists/[slug]/page.tsx`

**Action**:
1. Create route that re-exports from `app/reading-lists/[slug]/page.tsx`
2. Add 301 redirect

**Verification**: `/account/reading-lists/[slug]` renders same content as `/reading-lists/[slug]`.

**Dependency**: 1.5

---

## Phase 4: Immersive Destinations
**Goal**: Build rich, standalone pages for Timeline, Wari, Saint Hubs, and 3D Experiences.
**Risk**: Higher (new page architectures) | **Duration**: ~8 steps | **Parallel batches**: 2

### Step 4.1 — Build immersive Timeline page at /learn/timeline
**File to create**: `app/learn/timeline/page.tsx`

**Changes**:
1. Extract timeline data from `components/cinematic-journey.tsx` (the hardcoded centuries)
2. Create filter bar: Century dropdown, Saint dropdown, Type/Composition dropdown
3. Fetch from DB: query compositions by century/saint relationships
4. Full-width timeline with vertical line, alternating left/right cards
5. Each card: century, saint name, key events, compositions count
6. Clicking an event → navigate to saint hub or composition reader
7. Sticky filter bar at top

**Data considerations**:
- Use existing `saint.period` field for century filtering
- Query: `db.composition.findMany({ where: { saint: { period: { contains: "17" } } } })`
- Also consider `db.saint.findMany()` grouped by period

**Verification**: `/learn/timeline` shows interactive timeline with working filters. Each event is clickable.

**Dependency**: 1.1 (route exists), 2.2 (timeline extracted from home)

---

### Step 4.2 — Build standalone Wari page at /wari
**File to edit**: `app/wari/page.tsx`

**Changes**:
1. Extract Wari Journey from `components/cinematic-journey.tsx` Section 4
2. Enhance with:
   - Route map (could use simple SVG or interactive map)
   - 3D Palkhi viewer (already exists at `components/3d/palkhi-viewer.tsx`)
   - Each stop: historical context + related abhangs
   - Cultural significance section with traditions and practices
   - Audio player integration (play traditional wari songs)
3. Section order:
   - Hero with Wari banner
   - Interactive Journey (scroll-based with progress)
   - Route Map
   - Historical Context
   - Cultural Significance
   - Related Abhangs (compositions associated with Wari)

**Verification**: `/wari` shows immersive experience. Scroll progress tracks correctly. All stops have content.

**Dependency**: 1.1 (route exists)

---

### Step 4.3 — Enhance Saint Hub page
**File to edit**: `app/saints/[slug]/page.tsx`

**Changes**:
1. Current page content ↔ Enhanced layout:
   - Hero: Saint name (Marathi + transliteration), period, region, image
   - Biography section (existing)
   - Timeline Placement — "This saint lived during [century]. View Timeline →"
   - Related Abhangs — list from `db.composition.findMany({ where: { saintId } })`
   - Related Literature — other compositions types by this saint
   - Historical Context — generated from period + region data
   - Influence Graph — embed simplified `KnowledgeGraph` component showing this saint's connections
2. New data: fetch compositions count, related saints, deity associations
3. Add "Explore in Knowledge Graph" link → `/graph?focus=saint-slug`

**Verification**: `/saints/[slug]` shows full hub with all sections. Related works load. Graph embed renders.

**Dependency**: 3.5 (saints route)

---

### Step 4.4 — Build 3D gateway at /learn/experiences
**File to create**: `app/learn/experiences/page.tsx`

**Changes**:
1. Gateway/catalog page listing all 6 3D experiences:
   - Temple View (`temple-viewer.tsx`)
   - Palkhi View (`palkhi-viewer.tsx`)
   - Bell Experience (`bell-viewer.tsx`)
   - Book Viewer (`book-viewer.tsx`)
   - Tulsi Experience (`tulsi-viewer.tsx`)
   - Deepak Experience (`deepak-viewer.tsx`)
2. Each: thumbnail, title, short description, "Experience →" CTA
3. Cards arranged by complexity (simple → immersive)

**File to create**: `app/learn/experiences/3d/page.tsx`

**Changes**:
1. Full immersive 3D page with viewer selector
2. Background: dark theme (matching current `/graph` page aesthetic)
3. Controls: select experience, fullscreen toggle, info panel

**Verification**: `/learn/experiences` lists all 6 experiences. Each navigates to viewer. `/learn/experiences/3d` renders with viewer.

**Dependency**: 1.1 (route exists)

---

### Step 4.5 — Create ContinueJourney component (personalized)
**File to create**: `components/continue-journey.tsx`

**Changes**:
1. Client component checking `useSession()`
2. If authenticated: fetch recently viewed (localStorage), bookmarks (API), suggested content (API)
3. 3-column: Recently Viewed, Saved Items, Suggested Content
4. If unauthenticated: show prompt "Sign in to continue your spiritual journey"
5. Each: 2-3 small cards with thumbnail, title, type badge
6. SSR-friendly (show skeleton first, hydrate)

**API endpoint needed**: `GET /api/user/journey` — returns { recent, saved, suggested }

**Verification**: Logged-in: shows personalized content. Logged-out: shows sign-in prompt.

**Dependency**: 2.4 (FeaturedPaths done), authentication infrastructure exists

---

### Step 4.6 — Create /learn/timeline API filters
**File to create**: `app/api/timeline/data/route.ts`

**Changes**:
1. GET with query params: `century`, `saintId`, `type`
2. Returns structured timeline events with relationships
3. Returns events grouped by century for the filter UI
4. Supports `?saintId=xxx` to filter events for a specific saint

**Verification**: `GET /api/timeline/data?century=17` returns relevant events.

**Dependency**: 4.1 (timeline page needs this endpoint)

---

## Phase 5: Polish & Verification
**Goal**: Visual consistency, code quality, and full feature parity verification.
**Risk**: Low | **Duration**: ~5 steps | **Parallel batches**: 2

### Step 5.1 — Reduce card styles to 3 types
**Action**: Audit all card components and consolidate to 3 styles:

| Style | CSS Class | Used For | Changes |
|-------|-----------|----------|---------|
| Content Card | `card-content` | Abhang/Composition cards | Consistent padding (p-5), 12px radius, shadow-sm, hover:shadow-md |
| Hub Card | `card-hub` | Featured paths, saint hubs | Large format, gradient overlay, image background |
| Micro Card | `card-micro` | Related items, suggestions | Border-only, no shadow, p-3, 8px radius |

**Files to check**:
- `components/saints-list.tsx` — SaintCard
- `components/search-results-list.tsx` — Result items
- `components/related-compositions.tsx` — Related items
- `components/cinematic-journey.tsx` — Various cards
- `components/featured-paths.tsx` — Path cards
- `components/daily-spiritual.tsx` — Daily cards

**Verification**: Visual audit — no more than 3 distinct card styles across the entire app.

**Dependency**: None (can parallel with Phase 4)

---

### Step 5.2 — Implement consistent spacing scale
**Action**: Audit and update Tailwind spacing usage across all page-level components.

**Target scale**:
```
padding: p-4 (16px) for cards, p-6 (24px) for sections
gaps: gap-4 (16px) between elements, gap-8 (32px) between sections
margins: mb-8 (32px) between sections, mb-12 (48px) between page sections
```

**Verification**: Consistent spacing feel across all pages. No wild outliers.

**Dependency**: None (can parallel)

---

### Step 5.3 — Full route inventory test
**Action**: Script that hits every route (old + new) and verifies 200 or 301 status.

**Routes to test**:
```
Old:  /, /sant, /sant/[slug], /abhang/[slug], /category, /category/[slug], /collections/[slug], /festival, /festival/[slug], /books, /cart, /checkout, /orders, /leaderboard, /reading-lists/[slug], /graph, /search, /search?q=test
New:  /, /explore, /library, /saints, /saints/[slug], /wari, /learn, /learn/timeline, /learn/experiences, /learn/experiences/3d, /community, /store, /store/books, /store/cart
API:  /api/search?q=test, /api/daily/content, /api/timeline/data, /api/saint/[slug], /api/graph/explore
```

**Verification**: Every route returns non-error status. All features accessible.

**Dependency**: Phase 1-4 complete

---

### Step 5.4 — Visual weight audit
**Action**: Walk through each page and verify visual weight follows Level 1-4 hierarchy.

**Checklist per page**:
- [ ] Level 1 elements (search, content) are most prominent
- [ ] Level 2 elements (navigation, featured cards) are clearly secondary
- [ ] Level 3 elements (categories, timeline entries) are subdued
- [ ] Level 4 elements (footer, stats, advanced) are minimal
- [ ] Saffron (#FF7A1A) used only for CTAs, active states, search
- [ ] Maroon (#6B1E1E) used only for headings
- [ ] Gold (#C9A227) used only for highlights
- [ ] Backgrounds are cream/light sand, not saffron

**Verification**: Pass/fail checklist per page.

**Dependency**: 5.1, 5.2

---

### Step 5.5 — TypeScript build + lint verification
**Action**:
```bash
bun run typecheck
bun run lint
bun run build  # runs full build chain
bun test
```

**Verification**: All three pass clean. If pre-existing errors exist, document them separately.

**Dependency**: All phases complete

---

## Parallelization Map

```
Batch 1 (Phase 1):
├── 1.1 → Create route stubs [independent]
├── 1.2 → Restructure header [independent]
└── 1.3 → Mobile bottom tab bar [independent]

Batch 2 (Phase 1):
├── 1.4 → SearchOverlay [depends on 1.2]
├── 1.5 → 301 redirects [depends on 1.1]
└── 1.6 → Update layout [depends on 1.2, 1.3]

Batch 3 (Phase 1):
└── 1.7 → Verify redirects [depends on 1.5, 1.6]

Batch 4 (Phase 2):
├── 2.1 → Simplify HeroSection [independent]
├── 2.3 → UniversalSearch [independent]
├── 2.5a → Daily content API [independent]
└── 2.7 → Move stats to footer [independent]

Batch 5 (Phase 2):
├── 2.2 → Extract timeline/Wari [depends on 1.1]
├── 2.4 → FeaturedPaths [depends on 1.1]
├── 2.5 → DailySpiritual [depends on 2.5a]
└── 2.6 → CulturalHighlights [independent]

Batch 6 (Phase 2):
└── 2.8 → Rebuild HomePage [depends on 2.1-2.7]

Batch 7 (Phase 3):
├── 3.1 → /explore landing [depends on 1.1]
├── 3.2 → /library page [depends on 1.1]
├── 3.4 → /community page [depends on 1.1]
├── 3.5 → /saints route [depends on 1.5]
└── 3.6 → /account/reading-lists [depends on 1.5]

Batch 8 (Phase 4):
├── 4.1 → /learn/timeline [depends on 2.2]
├── 4.2 → /wari page [depends on 2.2]
├── 4.3 → Saint Hub [depends on 3.5]
├── 4.4 → 3D gateway [depends on 1.1]
├── 4.5 → ContinueJourney [depends on Phase 2]
└── 4.6 → Timeline API [depends on 4.1]

Batch 9 (Phase 5):
├── 5.1 → Card styles [independent]
├── 5.2 → Spacing scale [independent]
├── 5.3 → Route inventory [depends on all]
├── 5.4 → Visual weight audit [depends on 5.1, 5.2]
└── 5.5 → Build verification [depends on all]
```

---

## Summary

| Phase | Steps | Parallel Batches | Risk | Key Deliverables |
|-------|-------|-----------------|------|------------------|
| 1. Navigation | 7 | 3 | Low | New routes, header, bottom tab, redirects |
| 2. Homepage | 8 | 3 | Medium | Simplified hero, universal search, featured paths, daily content |
| 3. Content Reorg | 6 | 3 | Medium | /explore, /library, /community, /store segregation |
| 4. Immersive | 6 | 2 | Higher | /learn/timeline, /wari, saint hubs, 3D gateway |
| 5. Polish | 5 | 2 | Low | Visual consistency, route audit, build verification |
| **Total** | **32** | **9** | — | — |
