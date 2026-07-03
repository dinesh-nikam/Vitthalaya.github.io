# Production Readiness Verification Plan — Digital Pandharpur

## TL;DR
> **Summary**: Comprehensive pre-production audit of the entire Digital Pandharpur platform covering git state, missing pages, navigation, footer, themes, images, routing, admin, real-time content, and code quality.
> **Deliverables**: Full verification report with pass/fail per area, fixes for blocking issues
> **Effort**: Large
> **Parallel**: YES - 5 waves
> **Critical Path**: Git audit → Missing pages → Navigation/Footer audit → Theme audit → Build verification

## Context

### Original Request
Verify ALL code before production: GitHub diff, navigation bar pages, about/donation pages, footer, real images (not icons/SVGs), routing correctness, day/night theme, admin panel, real-time content (not mock).

### Interview Summary
No interview needed — request is self-contained verification audit. Exploration completed with 3 parallel agents + direct inspection.

### Key Findings (Pre-Generated from Exploration)

| Area | Status | Severity |
|------|--------|----------|
| Uncommitted changes (60 modified + 60 new) | CRITICAL | Blocks production |
| No `/about` page | HIGH | Missing page |
| No `/donation` page | HIGH | Missing page |
| Footer is minimal (copyright only) | HIGH | Poor UX |
| No global dark/light theme toggle | MEDIUM | Feature gap |
| Checkout uses mock Razorpay in dev mode | MEDIUM | Needs production flag |
| Library page uses `dangerouslySetInnerHTML` for icons | HIGH | Security risk |
| VitthalayaShell re-creates fonts (duplicated) | LOW | Performance |
| ESLint: many unused variable warnings | LOW | Code quality |
| Navigation missing about/donation links | HIGH | Incomplete nav |

## Work Objectives

### Core Objective
Audit the entire application for production readiness across 10 verification dimensions, produce a pass/fail report, and fix all BLOCKER issues.

### Deliverables
1. Production audit report with every check item marked PASS/FAIL
2. Fixes for all BLOCKER issues (missing pages, broken routing, security risks)
3. Clean git state (all changes committed or explicitly deferred)

### Definition of Done (verifiable conditions with commands)
- `bun run typecheck` passes with zero errors
- `bun run lint` passes with zero errors (warnings acceptable)
- All pages in navigation have working routes (no 404s)
- Footer contains all critical links (about, donation, privacy, etc.)
- Dark/light theme toggle works globally
- Admin panel loads with real DB data
- No mock/placeholder data in production paths
- All images are real photographs, not broken references
- Git working tree is clean or changes are committed

### Must Have
- About page exists and is accessible
- Donation page exists and is accessible
- Site-wide footer with essential links
- Global dark/light theme toggle
- No `dangerouslySetInnerHTML` with user content
- All navigation links resolve to working pages
- Checkout mock data only in dev mode
- TypeScript compiles cleanly

### Must NOT Have (guardrails)
- Do NOT modify business logic — only fix structural/routing/UI issues
- Do NOT change database schema
- Do NOT remove existing features
- Do NOT add new dependencies
- Do NOT refactor working components unless they have blocking bugs

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Manual verification via build + typecheck + lint
- QA scenario: Every page visited via route check, navigation verified
- Evidence: `.omo/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy

### Wave 1: Git State & Build Foundation
> Fix the foundation before auditing the building.

- [ ] 1. Git State Audit & Commit
- [ ] 2. TypeScript & Lint Verification

### Wave 2: Missing Pages & Navigation
> Create what's missing, fix what's broken.

- [ ] 3. Create About Page
- [ ] 4. Create Donation Page
- [ ] 5. Fix Navigation — Add All Required Links
- [ ] 6. Fix Site-Wide Footer

### Wave 3: Theme, Images & Security
> Visual and security audit.

- [ ] 7. Global Dark/Light Theme Toggle
- [ ] 8. Image Audit — Real Images vs Icons
- [ ] 9. Security Audit — dangerouslySetInnerHTML & Mock Data

### Wave 4: Routing & Content Verification
> Every page must work.

- [ ] 10. Route Verification — All Pages Accessible
- [ ] 11. Admin Panel Verification
- [ ] 12. Real-Time Content Verification

### Wave 5: Final Build & Evidence
> Prove it works.

- [ ] 13. Final Build Verification
- [ ] 14. Generate Audit Report

### Dependency Matrix
```
Task 1 (git) → Task 2 (build)
Task 2 → Task 3, 4, 5, 6, 7 (parallel)
Task 3+4 → Task 5 (nav includes new pages)
Task 5 → Task 10 (routing checks nav links)
Task 9 → Task 11 (admin security)
Task 10+11+12 → Task 13 (final build)
Task 13 → Task 14 (audit report)
```

### Agent Dispatch Summary
- Wave 1: 2 tasks → quick category
- Wave 2: 4 tasks → frontend-developer + quick
- Wave 3: 3 tasks → frontend-developer + deep
- Wave 4: 3 tasks → unspecified-high
- Wave 5: 2 tasks → unspecified-high

---

## TODOs

- [ ] 1. Git State Audit & Commit

  **What to do**: 
  1. Run `git status` to confirm all changes
  2. Run `git diff --stat HEAD` to quantify changes
  3. Run `git log --oneline -5` to check recent commits
  4. Stage all files: `git add -A`
  5. Create a comprehensive commit: `git commit -m "feat: production readiness — navigation, pages, themes, footer, admin, security hardening"`
  6. If commit fails, investigate and fix
  7. Verify clean state: `git status` should show "nothing to commit"

  **Must NOT do**: Do NOT push to remote. Do NOT force push. Do NOT amend existing commits.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Simple git operations
  - Skills: [`git-master`] - Git operations
  - Omitted: All others

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [Task 2] | Blocked By: []

  **References**:
  - Pattern: `AGENTS.md` - Git conventions (Conventional Commits)
  - Current state: 60 modified files + ~60 untracked files per `git status`

  **Acceptance Criteria**:
  - [ ] `git status` shows clean working tree
  - [ ] Commit message follows Conventional Commits format
  - [ ] No files left unstaged

  **QA Scenarios**:
  ```
  Scenario: Clean git state
    Tool: Bash
    Steps: Run `git status`
    Expected: "nothing to commit, working tree clean" or branch is clean
    Evidence: .omo/evidence/task-1-git-status.txt
  ```

  **Commit**: YES | Message: `feat: production readiness — navigation, pages, themes, footer, admin, security hardening` | Files: [all]

---

- [ ] 2. TypeScript & Lint Verification

  **What to do**:
  1. Run `bun run typecheck` (which runs `tsc --noEmit`)
  2. Capture ALL errors — document each one
  3. Run `bun run lint`
  4. Capture ALL errors (not warnings — warnings are acceptable per ESLint config)
  5. For each TypeScript ERROR (not warning), determine if it's blocking
  6. Fix blocking TypeScript errors (type mismatches, missing imports, syntax errors)
  7. Re-run typecheck until clean

  **Must NOT do**: Do NOT fix ESLint warnings (many are expected per project config). Do NOT suppress errors with `@ts-ignore`. Do NOT modify tsconfig.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Running commands + fixing type errors
  - Skills: [`lint-and-validate`] - Type checking and linting
  - Omitted: All others

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [Tasks 3-9] | Blocked By: [Task 1]

  **References**:
  - Config: `tsconfig.json` - TypeScript configuration
  - Config: `eslint.config.js` - ESLint flat config (very permissive)
  - AGENTS.md: `bun run typecheck` runs `tsc --noEmit`

  **Acceptance Criteria**:
  - [ ] `bun run typecheck` exits with code 0
  - [ ] `bun run lint` exits with 0 errors (warnings OK)
  - [ ] No `@ts-ignore` or `@ts-expect-error` added

  **QA Scenarios**:
  ```
  Scenario: TypeScript compiles cleanly
    Tool: Bash
    Steps: Run `bun run typecheck 2>&1`
    Expected: Exit code 0, no error output
    Evidence: .omo/evidence/task-2-typecheck.txt

  Scenario: Lint passes
    Tool: Bash
    Steps: Run `bun run lint 2>&1`
    Expected: Exit code 0, no error-level findings
    Evidence: .omo/evidence/task-2-lint.txt
  ```

  **Commit**: YES | Message: `fix: resolve TypeScript errors for production readiness` | Files: [changed .ts/.tsx files]

---

- [ ] 3. Create About Page

  **What to do**:
  1. Create `app/about/page.tsx` — a proper About page for Digital Pandharpur
  2. Content must include:
     - Project mission (Marathi + English)
     - What is Digital Pandharpur (digital preservation of Warkari literature)
     - Key features (search, composition reader, community, book commerce)
     - Technology stack mention (Next.js, Prisma, Meilisearch)
     - Open source / community contribution mention
     - Contact / contribution info
  3. Use server component (not client) for SEO
  4. Export proper metadata: `title`, `description`, `openGraph`
  5. Use existing design patterns (breadcrumbs, marathiHeading, card layouts)
  6. Reference the VitthalayaShell or V4PageShell for consistent styling
  7. Add `canonicalMetadata({ canonical: '/about' })` for SEO

  **Must NOT do**: Do NOT create client-side about page. Do NOT use placeholder text. Do NOT add new dependencies.

  **Recommended Agent Profile**:
  - Category: `frontend-developer` - Reason: Page creation with design system
  - Skills: [`nextjs-best-practices`, `frontend-design`] - Next.js page patterns
  - Omitted: [`backend-architect`, `database-architect`]

  **Parallelization**: Can Parallel: YES (with Tasks 4,6,7) | Wave 2 | Blocks: [Task 5, 10] | Blocked By: [Task 2]

  **References**:
  - Pattern: `app/store/page.tsx` - Server component page with metadata, breadcrumbs
  - Pattern: `app/community/page.tsx` - Rich content page with server-side data
  - Pattern: `app/learn/page.tsx` - Educational content page structure
  - SEO: `src/lib/seo.ts` - `canonicalMetadata` function
  - Design: `app/globals.css` - CSS variables, color palette
  - Content source: `README.md` - Project description and mission

  **Acceptance Criteria**:
  - [ ] `app/about/page.tsx` exists
  - [ ] Page exports metadata with title containing "About" / "बद्दल"
  - [ ] Page has breadcrumbs linking to home
  - [ ] Page content includes project mission, features, tech stack
  - [ ] No TypeScript errors on the page
  - [ ] Page renders at `/about` route

  **QA Scenarios**:
  ```
  Scenario: About page renders
    Tool: Bash
    Steps: Run `bun run typecheck` and verify no errors in app/about/
    Expected: No type errors
    Evidence: .omo/evidence/task-3-about-typecheck.txt

  Scenario: About page has correct metadata
    Tool: Bash
    Steps: Grep for `export const metadata` or `generateMetadata` in app/about/page.tsx
    Expected: Metadata export exists with title and description
    Evidence: .omo/evidence/task-3-about-metadata.txt
  ```

  **Commit**: YES | Message: `feat: add about page with project mission and features` | Files: [app/about/page.tsx]

---

- [ ] 4. Create Donation Page

  **What to do**:
  1. Create `app/donate/page.tsx` — a Donation / Support page
  2. Content must include:
     - Why donations matter (preserving Marathi literary heritage)
     - What donations fund (server costs, content digitization, community tools)
     - Donation methods (UPI, bank transfer details — use placeholder amounts)
     - Note: "This is a non-commercial cultural preservation project"
     - Alternative: link to community contribution (volunteer, content editing)
  3. Use server component for SEO
  4. Export proper metadata
  5. Add `canonicalMetadata({ canonical: '/donate' })`
  6. Keep it respectful and culturally appropriate (Warkari tradition of seva)

  **Must NOT do**: Do NOT integrate actual payment gateways. Do NOT add Stripe/Razorpay for donations. Do NOT use aggressive donation prompts.

  **Recommended Agent Profile**:
  - Category: `frontend-developer` - Reason: Page creation
  - Skills: [`nextjs-best-practices`] - Next.js patterns
  - Omitted: [`backend-architect`, `database-architect`]

  **Parallelization**: Can Parallel: YES (with Tasks 3,6,7) | Wave 2 | Blocks: [Task 5, 10] | Blocked By: [Task 2]

  **References**:
  - Pattern: `app/store/page.tsx` - Simple static page with cards
  - Pattern: `app/community/page.tsx` - Server component with metadata
  - SEO: `src/lib/seo.ts` - `canonicalMetadata`
  - Tone: `README.md` - "Sacredness - No intrusive ads or gamification"

  **Acceptance Criteria**:
  - [ ] `app/donate/page.tsx` exists
  - [ ] Page exports metadata with title containing "Donate" / "दान"
  - [ ] Page has breadcrumbs
  - [ ] Page content explains donation purpose
  - [ ] No payment gateway integration (static info only)
  - [ ] No TypeScript errors

  **QA Scenarios**:
  ```
  Scenario: Donate page renders
    Tool: Bash
    Steps: Run `bun run typecheck` and verify no errors in app/donate/
    Expected: No type errors
    Evidence: .omo/evidence/task-4-donate-typecheck.txt

  Scenario: No payment gateway
    Tool: Bash
    Steps: Grep app/donate/page.tsx for "razorpay|stripe|payment"
    Expected: No matches (donation page should be informational only)
    Evidence: .omo/evidence/task-4-no-payment.txt
  ```

  **Commit**: YES | Message: `feat: add donation page with support information` | Files: [app/donate/page.tsx]

---

- [ ] 5. Fix Navigation — Add All Required Links

  **What to do**:
  1. Update `components/header-nav.tsx`:
     - PILLAR_LINKS should include: explore, library, saints, wari, learn (already there)
     - Add to user dropdown or separate nav section: about (`/about`), donate (`/donate`)
  2. Update `components/bottom-tab-bar.tsx`:
     - Add to MORE_ITEMS: about (`/about`), donate (`/donate`)
  3. Update `components/vitthalaya-shell.tsx` footer links:
     - Add: About, Donate to the footer link list
  4. Ensure consistency: all 3 navigation surfaces (desktop nav, mobile tab bar, shell footer) include the same core links
  5. Desktop header nav links: explore, library, saints, wari, learn
  6. Desktop header should also show: about, donate (either in user menu or as secondary links)
  7. Mobile bottom tab: home, search, library, saints, more (keep as-is)
  8. Mobile "More" drawer: add about, donate

  **Must NOT do**: Do NOT change the existing 5 pillar links. Do NOT remove any existing navigation items. Do NOT change the visual design.

  **Recommended Agent Profile**:
  - Category: `frontend-developer` - Reason: Navigation component updates
  - Skills: [`nextjs-best-practices`] - Component patterns
  - Omitted: [`backend-architect`]

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [Task 10] | Blocked By: [Tasks 3, 4]

  **References**:
  - File: `components/header-nav.tsx:14-20` - PILLAR_LINKS array
  - File: `components/header-nav.tsx:128-135` - User menu items
  - File: `components/bottom-tab-bar.tsx:28-35` - MORE_ITEMS array
  - File: `components/vitthalaya-shell.tsx:154-166` - Footer link list

  **Acceptance Criteria**:
  - [ ] `/about` link appears in at least one navigation surface
  - [ ] `/donate` link appears in at least one navigation surface
  - [ ] Desktop nav has all 5 pillar links + about/donate accessible
  - [ ] Mobile "More" drawer includes about and donate
  - [ ] VitthalayaShell footer includes about and donate
  - [ ] No existing links removed
  - [ ] TypeScript compiles cleanly

  **QA Scenarios**:
  ```
  Scenario: Navigation includes new pages
    Tool: Bash
    Steps: Grep components/header-nav.tsx for '/about' and '/donate'
    Expected: Both routes found in navigation code
    Evidence: .omo/evidence/task-5-nav-about.txt

  Scenario: Bottom tab includes new pages
    Tool: Bash
    Steps: Grep components/bottom-tab-bar.tsx for '/about' and '/donate'
    Expected: Both routes found in MORE_ITEMS
    Evidence: .omo/evidence/task-5-nav-donate.txt

  Scenario: Footer includes new pages
    Tool: Bash
    Steps: Grep components/vitthalaya-shell.tsx for 'About' and 'Donate'
    Expected: Both found in footer link list
    Evidence: .omo/evidence/task-5-footer-links.txt
  ```

  **Commit**: YES | Message: `feat: add about and donate links to navigation and footer` | Files: [components/header-nav.tsx, components/bottom-tab-bar.tsx, components/vitthalaya-shell.tsx]

---

- [ ] 6. Fix Site-Wide Footer

  **What to do**:
  1. The layout footer in `app/layout.tsx:101-107` is minimal — just copyright text
  2. Create a proper footer component `components/site-footer.tsx` with:
     - Project name and tagline
     - Quick links: Explore, Library, Saints, Festivals, Wari, Learn
     - Info links: About, Donate, Privacy
     - Community links: Leaderboard, Corrections
     - Admin link (visible only when admin is logged in)
     - Copyright with year (dynamic)
     - "Made with ❤️ for Warkari community" or similar
     - Social/contact links if available
  3. Replace the inline footer in `app/layout.tsx` with `<SiteFooter />`
  4. Ensure footer works in both light and dark themes
  5. Footer should be responsive (stack on mobile, horizontal on desktop)

  **Must NOT do**: Do NOT add analytics scripts. Do NOT add social media icons that link to non-existent pages. Do NOT add newsletter signup without backend.

  **Recommended Agent Profile**:
  - Category: `frontend-developer` - Reason: Component creation + layout update
  - Skills: [`nextjs-best-practices`, `frontend-design`] - UI component + design
  - Omitted: [`backend-architect`]

  **Parallelization**: Can Parallel: YES (with Tasks 3,4,7) | Wave 2 | Blocks: [Task 10] | Blocked By: [Task 2]

  **References**:
  - File: `app/layout.tsx:101-107` - Current minimal footer
  - Pattern: `components/header-nav.tsx` - Navigation link patterns
  - Pattern: `app/globals.css` - Theme CSS variables for footer styling
  - Design: Footer should use `bg-saffron/5` or `bg-card` with `border-t`

  **Acceptance Criteria**:
  - [ ] `components/site-footer.tsx` exists
  - [ ] Footer contains at least 8 navigation links
  - [ ] Footer contains copyright with dynamic year
  - [ ] Footer is responsive
  - [ ] Footer renders in both light and dark themes
  - [ ] `app/layout.tsx` imports and uses `<SiteFooter />`
  - [ ] TypeScript compiles cleanly

  **QA Scenarios**:
  ```
  Scenario: Footer component exists and compiles
    Tool: Bash
    Steps: Run `bun run typecheck 2>&1 | grep -i footer`
    Expected: No errors related to footer
    Evidence: .omo/evidence/task-6-footer-typecheck.txt

  Scenario: Footer has required links
    Tool: Bash
    Steps: Grep components/site-footer.tsx for 'about', 'donate', 'explore', 'library', 'saints'
    Expected: All 5 links found
    Evidence: .omo/evidence/task-6-footer-links.txt

  Scenario: Layout uses SiteFooter
    Tool: Bash
    Steps: Grep app/layout.tsx for 'SiteFooter'
    Expected: Import and usage found
    Evidence: .omo/evidence/task-6-layout-footer.txt
  ```

  **Commit**: YES | Message: `feat: implement comprehensive site-wide footer with navigation links` | Files: [components/site-footer.tsx, app/layout.tsx]

---

- [ ] 7. Global Dark/Light Theme Toggle

  **What to do**:
  1. Create `components/theme-toggle.tsx`:
     - Button with sun/moon icon
     - Toggles `dark` class on `document.documentElement`
     - Persists preference in `localStorage`
     - Respects `prefers-color-scheme` on first load
  2. Add `<ThemeToggle />` to `components/header-nav.tsx` (desktop) and `components/bottom-tab-bar.tsx` (mobile "More" drawer)
  3. The CSS already supports `.dark` class (globals.css lines 28-42)
  4. Verify `suppressHydrationWarning` is on `<html>` tag (already present in layout.tsx:61)
  5. Initialize theme from localStorage in a script tag or provider to prevent flash

  **Must NOT do**: Do NOT add next-themes or any new dependency. Do NOT use React state for theme on server (must be client-only). Do NOT change existing CSS variables.

  **Recommended Agent Profile**:
  - Category: `frontend-developer` - Reason: Client component with localStorage
  - Skills: [`nextjs-best-practices`] - Client-side patterns
  - Omitted: [`backend-architect`]

  **Parallelization**: Can Parallel: YES (with Tasks 3,4,6) | Wave 2 | Blocks: [Task 8] | Blocked By: [Task 2]

  **References**:
  - CSS: `app/globals.css:10-42` - `:root` and `.dark` CSS variables
  - Pattern: `components/composition-reader.tsx:75-90` - Existing theme toggle logic
  - File: `app/layout.tsx:61` - `suppressHydrationWarning` already on html tag
  - Pattern: `components/providers.tsx` - Client-side provider pattern

  **Acceptance Criteria**:
  - [ ] `components/theme-toggle.tsx` exists
  - [ ] Theme toggle button renders with sun/moon icon
  - [ ] Clicking toggle adds/removes `dark` class on `<html>`
  - [ ] Theme preference persists in localStorage
  - [ ] Toggle is visible in desktop header nav
  - [ ] Toggle is visible in mobile "More" drawer
  - [ ] No flash of wrong theme on page load
  - [ ] TypeScript compiles cleanly

  **QA Scenarios**:
  ```
  Scenario: Theme toggle component exists
    Tool: Bash
    Steps: Check file exists: `Test-Path components/theme-toggle.tsx`
    Expected: True
    Evidence: .omo/evidence/task-7-toggle-exists.txt

  Scenario: Theme toggle used in header
    Tool: Bash
    Steps: Grep components/header-nav.tsx for 'ThemeToggle' or 'theme-toggle'
    Expected: Import and usage found
    Evidence: .omo/evidence/task-7-toggle-header.txt

  Scenario: No new dependencies added
    Tool: Bash
    Steps: Grep package.json for 'next-themes'
    Expected: No match
    Evidence: .omo/evidence/task-7-no-new-deps.txt
  ```

  **Commit**: YES | Message: `feat: add global dark/light theme toggle with localStorage persistence` | Files: [components/theme-toggle.tsx, components/header-nav.tsx, components/bottom-tab-bar.tsx]

---

- [ ] 8. Image Audit — Real Images vs Icons

  **What to do**:
  1. Audit ALL image references across the app:
     - `public/images/` — 31 files (verify they are real .jpg/.png, not empty/placeholder)
     - `src/lib/assets-registry.ts` — Unsplash URLs (verify they point to real images)
     - `components/saints-list.tsx` — Uses SAINTS_COLLECTION from assets-registry
     - Any `<img>` or `<Image>` tags in page components
  2. Check `public/images/icons/` — files named as "icons" but are .jpg (temple-pandharpur.jpg, wari.jpg, etc.) — these are REAL images, not SVG icons. This is fine.
  3. Verify SVG files in `public/images/icons/` (reading-mode.svg, queue-add.svg, etc.) are used for UI icons only, not content images
  4. Verify `components/vitthalaya-pilgrimage.tsx` — uses CSS/Three.js for hero, no image references
  5. Check that saints pages use real images from assets-registry (Unsplash URLs)
  6. Confirm NO placeholder.com or via.placeholder.com URLs exist

  **Must NOT do**: Do NOT replace working image URLs. Do NOT download images locally. Do NOT change the assets-registry.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Audit/grep task, minimal changes
  - Skills: [] - Just grep and report
  - Omitted: All others

  **Parallelization**: Can Parallel: YES (with Tasks 5,6,7) | Wave 3 | Blocks: [Task 14] | Blocked By: [Task 2]

  **References**:
  - Registry: `src/lib/assets-registry.ts` — 100+ curated Unsplash image URLs
  - Component: `components/saints-list.tsx:9-23` — SAINT_IMAGES mapping
  - Public: `public/images/` — 31 local image files
  - SVGs: `public/images/icons/*.svg` — 5 SVG files for UI icons

  **Acceptance Criteria**:
  - [ ] No `placeholder.com` or `via.placeholder.com` URLs in codebase
  - [ ] All Unsplash URLs in assets-registry follow `https://images.unsplash.com/` pattern
  - [ ] `public/images/` contains real .jpg/.png files (not empty stubs)
  - [ ] SVGs in `public/images/icons/` are only used for UI elements, not content
  - [ ] Saints pages reference real images (not empty/broken src)

  **QA Scenarios**:
  ```
  Scenario: No placeholder images
    Tool: Bash/Grep
    Steps: Search codebase for 'placeholder.com' and 'via.placeholder'
    Expected: Zero matches
    Evidence: .omo/evidence/task-8-no-placeholders.txt

  Scenario: Unsplash URLs valid pattern
    Tool: Bash/Grep
    Steps: Grep assets-registry.ts for 'unsplash.com/photo-'
    Expected: All URLs match pattern
    Evidence: .omo/evidence/task-8-unsplash-pattern.txt

  Scenario: Public images exist
    Tool: Bash
    Steps: Run `Get-ChildItem public/images/ -Recurse | Measure-Object`
    Expected: Count > 25 files
    Evidence: .omo/evidence/task-8-public-images.txt
  ```

  **Commit**: NO (audit only, no code changes)

---

- [ ] 9. Security Audit — dangerouslySetInnerHTML & Mock Data

  **What to do**:
  1. Search for ALL `dangerouslySetInnerHTML` usage:
     - `app/layout.tsx:77-79` — JSON-LD structured data (OK, server-generated)
     - `app/layout.tsx:114-126` — Service worker registration (OK, static string)
     - `components/vitthalaya-shell.tsx:86` — background SVG URL (OK, static)
     - **CRITICAL**: `app/library/page.tsx:47` — `dangerouslySetInnerHTML={{ __html: icon }}` where `icon` is a string from CONTENT_TYPES array. This is hardcoded, not user input. LOW RISK but should use actual React components instead.
  2. Search for mock/placeholder data in production code paths:
     - `app/checkout/page.tsx:93-95` — mock Razorpay data. ACCEPTABLE only when `!razorpayKey` (dev mode guard exists)
     - No other mock data found in production pages
  3. Verify admin routes are protected (session + ADMIN role check)
  4. Verify CSRF protection is active (middleware.ts)
  5. Check for hardcoded API keys or secrets (should use `Bun.env.*`)

  **Must NOT do**: Do NOT change the checkout mock data logic (it's correctly guarded). Do NOT modify middleware security.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Audit/grep task
  - Skills: [`backend-security-coder`] - Security audit knowledge
  - Omitted: [`frontend-developer`]

  **Parallelization**: Can Parallel: YES (with Task 8) | Wave 3 | Blocks: [Task 14] | Blocked By: [Task 2]

  **References**:
  - File: `app/library/page.tsx:47` — `dangerouslySetInnerHTML` with icon string
  - File: `app/checkout/page.tsx:80-97` — Mock Razorpay guard
  - File: `middleware.ts` — CSRF + security headers
  - File: `src/lib/security-headers.ts` — Security header implementation

  **Acceptance Criteria**:
  - [ ] No `dangerouslySetInnerHTML` with user-controlled content
  - [ ] Library page icon rendering uses safe approach (React component or SVG import)
  - [ ] Mock payment data only in dev mode (guarded by env check)
  - [ ] No hardcoded API keys or secrets
  - [ ] Admin routes all have auth + role checks

  **QA Scenarios**:
  ```
  Scenario: dangerouslySetInnerHTML audit
    Tool: Bash/Grep
    Steps: Grep all .tsx files for 'dangerouslySetInnerHTML'
    Expected: Only server-generated JSON-LD and static strings
    Evidence: .omo/evidence/task-9-dsisg-audit.txt

  Scenario: No hardcoded secrets
    Tool: Bash/Grep
    Steps: Grep for 'sk_live|sk_test|api_key.*=.*["\x27][a-zA-Z0-9]'
    Expected: Zero matches
    Evidence: .omo/evidence/task-9-no-secrets.txt
  ```

  **Commit**: YES (only if fixing library page icon rendering) | Message: `fix: replace dangerouslySetInnerHTML with safe SVG rendering in library page` | Files: [app/library/page.tsx]

---

- [ ] 10. Route Verification — All Pages Accessible

  **What to do**:
  1. Enumerate ALL page routes from `app/**/page.tsx` (56 files found)
  2. For each page, verify:
     - File exists and has valid default export
     - No obvious runtime errors (missing imports, undefined references)
     - Metadata export exists (for SEO)
  3. Cross-reference navigation links against actual routes:
     - Header nav: `/explore`, `/library`, `/saints`, `/wari`, `/learn` — all have page.tsx ✓
     - Bottom tab: `/`, `/search`, `/library`, `/saints` — all have page.tsx ✓
     - More drawer: `/explore`, `/wari`, `/learn`, `/community`, `/store`, `/account` — all have page.tsx ✓
  4. Check for orphan pages (pages with no navigation path to them)
  5. Check middleware redirects: `/sant` → `/saints`, `/category` → `/explore`, `/leaderboard` → `/community`
     - NOTE: `/sant` still has a page.tsx! The middleware redirects it. Need to verify `/saints` is the canonical version.
  6. Verify dynamic routes have proper `generateStaticParams` or `force-dynamic`
  7. Check that pages without auth protection don't expose sensitive data

  **Must NOT do**: Do NOT delete any page files. Do NOT change routing patterns.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Comprehensive audit across 56 pages
  - Skills: [`nextjs-best-practices`] - Routing knowledge
  - Omitted: [`backend-architect`]

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [Task 13] | Blocked By: [Tasks 3,4,5,6]

  **References**:
  - All 56 `app/**/page.tsx` files (see glob results)
  - File: `middleware.ts:12-16` — REDIRECTS map
  - Pattern: Each page should export `default` function and optionally `metadata`

  **Acceptance Criteria**:
  - [ ] All 56 page files have valid default exports
  - [ ] All navigation links resolve to existing pages
  - [ ] No orphan pages without navigation path
  - [ ] Middleware redirects are consistent with page existence
  - [ ] Dynamic routes have data fetching strategy defined
  - [ ] Auth-protected pages check session

  **QA Scenarios**:
  ```
  Scenario: All nav links resolve
    Tool: Bash
    Steps: For each nav href, check `Test-Path "app/{route}/page.tsx"`
    Expected: All return True
    Evidence: .omo/evidence/task-10-nav-routes.txt

  Scenario: No orphan pages
    Tool: Bash
    Steps: Compare page.tsx list against all navigation references
    Expected: Every page reachable from at least one nav link or redirect
    Evidence: .omo/evidence/task-10-orphan-check.txt
  ```

  **Commit**: NO (audit only, unless fixing orphan routes)

---

- [ ] 11. Admin Panel Verification

  **What to do**:
  1. Verify all admin sub-pages exist:
     - `/admin` — Dashboard ✓
     - `/admin/analytics` — Analytics ✓
     - `/admin/books` — Book management ✓
     - `/admin/collections` — Collections ✓
     - `/admin/discovery` — Content discovery ✓
     - `/admin/moderation` — Moderation ✓
     - `/admin/orders` — Order management ✓
     - `/admin/print-partners` — Print partners ✓
     - `/admin/pricing` — Pricing settings ✓
  2. Verify each admin page has:
     - `getServerSession(authOptions)` check
     - `role !== 'ADMIN'` redirect
     - `export const dynamic = 'force-dynamic'`
  3. Verify admin pages query real DB (not mock data)
  4. Check that admin API routes (`/api/admin/*`) are protected
  5. Verify `src/lib/require-admin.ts` exists and is used

  **Must NOT do**: Do NOT change admin business logic. Do NOT add new admin features.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Multi-page audit with security checks
  - Skills: [`backend-security-coder`] - Auth/security verification
  - Omitted: [`frontend-developer`]

  **Parallelization**: Can Parallel: YES (with Task 10) | Wave 4 | Blocks: [Task 13] | Blocked By: [Task 2]

  **References**:
  - Pages: `app/admin/*/page.tsx` — 9 admin pages
  - Auth: `src/lib/auth.ts` — NextAuth configuration
  - Guard: `src/lib/require-admin.ts` — Admin role check utility
  - API: `app/api/admin/*/route.ts` — Admin API routes

  **Acceptance Criteria**:
  - [ ] All 9 admin pages have auth + role checks
  - [ ] All admin pages use `force-dynamic`
  - [ ] Admin pages query Prisma DB (real data)
  - [ ] No mock data in admin pages
  - [ ] Admin API routes are protected

  **QA Scenarios**:
  ```
  Scenario: Admin auth checks present
    Tool: Bash/Grep
    Steps: Grep each admin page for 'getServerSession' and 'ADMIN'
    Expected: Every admin page.tsx contains both
    Evidence: .omo/evidence/task-11-admin-auth.txt

  Scenario: Admin uses real DB
    Tool: Bash/Grep
    Steps: Grep admin pages for 'db.' (Prisma client usage)
    Expected: Every admin page has DB queries
    Evidence: .omo/evidence/task-11-admin-db.txt
  ```

  **Commit**: NO (audit only)

---

- [ ] 12. Real-Time Content Verification

  **What to do**:
  1. For each major page, verify content source:
     - **Home** (`app/page.tsx`): Queries `db.saint`, `db.category`, `db.composition.count()`, `db.bookPublication.count()` — REAL ✓
     - **Explore** (`app/explore/page.tsx`): Fetches from `/api/explore/*` — REAL (client-side) ✓
     - **Library** (`app/library/page.tsx`): Hardcoded content types — STATIC (appropriate for category listing)
     - **Saints** (`app/saints/page.tsx`): Queries `db.saint.findMany()` — REAL ✓
     - **Wari** (`app/wari/page.tsx`): Hardcoded journey stops — STATIC (educational content, appropriate)
     - **Learn** (`app/learn/page.tsx`): Hardcoded timeline/traditions — STATIC (educational content, appropriate)
     - **Community** (`app/community/page.tsx`): Queries `db.user.count()`, `db.correctionSuggestion`, etc. — REAL ✓
     - **Store** (`app/store/page.tsx`): Static section links — STATIC (appropriate for store index)
     - **Search** (`app/search/page.tsx`): Queries saints, deities, festivals from DB — REAL ✓
     - **Admin** (`app/admin/page.tsx`): Queries all counts from DB — REAL ✓
     - **Checkout** (`app/checkout/page.tsx`): Uses localStorage cart + API — REAL (with dev mock for payment)
  2. Verify NO page shows fake "Coming Soon" or "Under Construction" messages
  3. Verify library stats "50,000+" is approximate but not wildly inaccurate
  4. Verify collections page queries real data

  **Must NOT do**: Do NOT change static educational content to dynamic. Do NOT add loading states that weren't there.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Multi-page content audit
  - Skills: [`nextjs-best-practices`] - Data fetching patterns
  - Omitted: All others

  **Parallelization**: Can Parallel: YES (with Tasks 10,11) | Wave 4 | Blocks: [Task 13] | Blocked By: [Task 2]

  **References**:
  - Pages: See analysis above for each page's data source
  - Pattern: Server components use `db.*` directly, client components fetch `/api/*`

  **Acceptance Criteria**:
  - [ ] Home page shows real DB counts
  - [ ] Saints page lists real saints from DB
  - [ ] Community page shows real user/correction counts
  - [ ] Search page queries real data
  - [ ] Admin dashboard shows real counts
  - [ ] No "Coming Soon" or "Under Construction" on any page
  - [ ] Static educational pages (Wari, Learn, Library) are intentionally static

  **QA Scenarios**:
  ```
  Scenario: Home page has real data
    Tool: Bash/Grep
    Steps: Grep app/page.tsx for 'db.' (Prisma queries)
    Expected: At least 3 DB queries found
    Evidence: .omo/evidence/task-12-home-db.txt

  Scenario: No "Coming Soon" text
    Tool: Bash/Grep
    Steps: Grep all page.tsx files for 'Coming Soon|Under Construction|जलद|लवकर'
    Expected: Zero matches
    Evidence: .omo/evidence/task-12-no-coming-soon.txt
  ```

  **Commit**: NO (audit only)

---

- [ ] 13. Final Build Verification

  **What to do**:
  1. Run `bun run typecheck` — must pass with zero errors
  2. Run `bun run lint` — must pass with zero errors
  3. Run `bun run build` — must complete successfully
  4. If build fails, diagnose and fix
  5. Document build output (size, warnings)
  6. Verify no regressions from earlier fixes

  **Must NOT do**: Do NOT skip build step. Do NOT ignore build warnings.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Build verification + potential debugging
  - Skills: [`nextjs-best-practices`] - Build configuration
  - Omitted: All others

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: [Task 14] | Blocked By: [Tasks 1-12]

  **References**:
  - Script: `package.json` — `build` script
  - Config: `next.config.js` — Next.js build configuration
  - Script: `scripts/switch-provider.ts` — Runs at build start

  **Acceptance Criteria**:
  - [ ] `bun run typecheck` exits 0
  - [ ] `bun run lint` exits 0
  - [ ] `bun run build` completes without errors
  - [ ] Build output shows all pages compiled

  **QA Scenarios**:
  ```
  Scenario: Clean build
    Tool: Bash
    Steps: Run `bun run build 2>&1`
    Expected: Exit code 0, "Build completed" or similar success message
    Evidence: .omo/evidence/task-13-build-output.txt
  ```

  **Commit**: NO (verification only)

---

- [ ] 14. Generate Audit Report

  **What to do**:
  1. Compile all findings from Tasks 1-13 into a structured report
  2. Save to `production-audit-report.md` at project root
  3. Report structure:
     - Executive Summary (PASS/FAIL overall)
     - Per-area results (Git, Pages, Navigation, Footer, Themes, Images, Security, Routing, Admin, Content, Build)
     - Issues found (with severity: BLOCKER/HIGH/MEDIUM/LOW)
     - Fixes applied
     - Remaining recommendations
  4. Present summary to user

  **Must NOT do**: Do NOT hide failures. Do NOT mark PASS on areas with issues.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: Report generation
  - Skills: [] - Just writing
  - Omitted: All others

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: [] | Blocked By: [Task 13]

  **Acceptance Criteria**:
  - [ ] `production-audit-report.md` exists at project root
  - [ ] Report covers all 10 verification dimensions
  - [ ] Every check item has PASS/FAIL status
  - [ ] All BLOCKER issues are documented with fix status
  - [ ] Report is presented to user for sign-off

  **QA Scenarios**:
  ```
  Scenario: Report exists and is complete
    Tool: Bash
    Steps: Check file exists and has > 100 lines
    Expected: File exists with substantial content
    Evidence: .omo/evidence/task-14-report.txt
  ```

  **Commit**: YES | Message: `docs: production audit report — pre-deployment verification` | Files: [production-audit-report.md]

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before completing.**
> **Never mark F1-F4 as checked before getting user's okay.**

- [ ] F1. Plan Compliance Audit — oracle
  - Verify every TODO task was completed as specified
  - Check all acceptance criteria were met
  - Verify no scope creep occurred

- [ ] F2. Code Quality Review — unspecified-high
  - Run `bun run typecheck` and `bun run lint`
  - Review all changed files for quality
  - Check for regressions

- [ ] F3. Real Manual QA — unspecified-high
  - Visit every page route (56 pages)
  - Test navigation links (desktop + mobile)
  - Test dark/light toggle
  - Verify footer renders
  - Check admin panel loads

- [ ] F4. Scope Fidelity Check — deep
  - Verify only verification/audit changes were made
  - No business logic changes
  - No schema changes
  - No new dependencies

## Commit Strategy
- Task 1: `feat: production readiness — comprehensive pre-deployment changes`
- Task 2: `fix: resolve TypeScript errors for production readiness`
- Task 3: `feat: add about page with project mission and features`
- Task 4: `feat: add donation page with support information`
- Task 5: `feat: add about and donate links to navigation and footer`
- Task 6: `feat: implement comprehensive site-wide footer with navigation links`
- Task 7: `feat: add global dark/light theme toggle with localStorage persistence`
- Task 9: `fix: replace dangerouslySetInnerHTML with safe SVG rendering in library page`
- Task 14: `docs: production audit report — pre-deployment verification`

## Success Criteria
1. All 14 TODO tasks complete
2. TypeScript compiles with zero errors
3. Lint passes with zero errors
4. Build completes successfully
5. All 56 pages accessible and working
6. Navigation includes about + donate pages
7. Footer has comprehensive links
8. Dark/light theme toggle works
9. No mock data in production code paths
10. Admin panel fully functional with real DB data
11. Audit report generated and user-approved
