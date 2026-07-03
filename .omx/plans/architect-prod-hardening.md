# ARCHITECT: Production Hardening — 100% Audit Score

## Current State vs Audit Gaps

The original audit (2026-06-20) scored the platform 23/100. Since then, many items have been implemented.
Below is the TRUE gap analysis after verifying every audit item against the actual codebase.

---

## Module-by-Module Status

### 1. Authentication (Audit: 25/100 → Target: 95/100)

**Already exists:**
- ✅ NextAuth with JWT sessions, Google OAuth, Credentials provider
- ✅ PBKDF2 600k iterations (production), 100k (dev) — `src/lib/auth.ts:10`
- ✅ Auth rate limiting: 5 attempts → 15min lockout — `src/lib/auth-rate-limit.ts`
- ✅ NEXTAUTH_SECRET throws in production if missing — `src/lib/auth.ts:132-136`
- ✅ Password hashing with salt — `src/lib/auth.ts:25-30`
- ✅ Email verification on registration — `app/api/auth/register/route.ts:51-60`

**Still missing:**
- [ ] **Registration doesn't use `validatePasswordComplexity`** — only checks `length < 6` (line 17). The function exists in `auth-rate-limit.ts:112` but isn't called from register route.
- [ ] **No session invalidation on password change** — no `change-password` endpoint exists at all
- [ ] **Password complexity messages should be bilingual** — current messages are Marathi-only, function exists but unused

**Files to change:**
- `app/api/auth/register/route.ts` — use `validatePasswordComplexity` instead of `length < 6`
- `app/api/auth/change-password/route.ts` — NEW: change password + invalidate old sessions

### 2. Security (Audit: 15/100 → Target: 90/100)

**Already exists:**
- ✅ Content Security Policy — `src/lib/security-headers.ts:13-24`
- ✅ HSTS (2 years, includeSubDomains, preload) — line 28
- ✅ X-Frame-Options: DENY — line 31
- ✅ X-Content-Type-Options: nosniff — line 34
- ✅ X-XSS-Protection — line 37
- ✅ Referrer-Policy — line 40
- ✅ Permissions-Policy (camera/mic/geo/payment disabled) — line 43
- ✅ CSRF protection (origin check on mutations) — `middleware.ts:34-55`
- ✅ File upload validation (MIME, size, magic bytes) — `src/lib/file-validator.ts`
- ✅ SCRAPE_API_KEY throws in production — `app/api/scrape/route.ts:13-15`
- ✅ WORKER_SECRET_KEY throws in production — `app/api/workers/process/route.ts:10-12`

**Still missing:**
- [ ] **CSRF header is set but not enforced** — middleware sets `X-CSRF-Rejected: true` header but never returns 403. The mutation goes through regardless.
- [ ] **`.env` committed with real secrets** — GROQ_API_KEY, DATABASE_URL, RAZORPAY keys in `.env`. Need `.env.example` (sanitized) and `.env` gitignored.
- [ ] **No input sanitization beyond Prisma** — user-generated content (corrections, notes) not sanitized against XSS
- [ ] **CSP uses `unsafe-inline` and `unsafe-eval`** — necessary for Next.js but should use nonce-based CSP for scripts

**Files to change:**
- `middleware.ts` — enforce CSRF by returning 403 instead of just setting header
- `.env` → `.env.example` (sanitized), `.env` added to `.gitignore`
- `src/lib/sanitize.ts` — NEW: input sanitization for user-generated content
- `src/lib/security-headers.ts` — add nonce-based CSP for inline scripts

### 3. Monitoring (Audit: 10/100 → Target: 85/100)

**Already exists:**
- ✅ Health check endpoint — `app/api/health/route.ts` (DB, Redis, Meilisearch, OpenSearch, memory)
- ✅ Basic console logging throughout

**Still missing:**
- [ ] **No error tracking (Sentry)** — no `@sentry/nextjs` package, no `sentry.client.config.ts`
- [ ] **No structured logging** — all logs are `console.log`/`console.error`, not queryable
- [ ] **No request ID propagation** — no way to trace a request across services
- [ ] **No metrics endpoint** — no Prometheus/OpenTelemetry metrics
- [ ] **No alerting configuration** — no Slack/PagerDuty integration

**Files to change:**
- `src/lib/logger.ts` — NEW: structured JSON logger with request ID
- `src/lib/telemetry.ts` — NEW: OpenTelemetry setup (lightweight)
- `app/api/metrics/route.ts` — NEW: Prometheus metrics endpoint
- `middleware.ts` — add request ID propagation
- `sentry.client.config.ts` — NEW: Sentry client config
- `sentry.server.config.ts` — NEW: Sentry server config
- `next.config.js` — add Sentry webpack plugin

### 4. Backups (Audit: 5/100 → Target: 80/100)

**Already exists:**
- ✅ Backup script — `scripts/backup.ts` (database + uploads, with cleanup)
- ✅ Database backup via pg_dump + gzip
- ✅ Uploads backup via tar.gz
- ✅ Old backup cleanup (30 day retention)

**Still missing:**
- [ ] **No backup automation** — script exists but no scheduling
- [ ] **No backup verification** — no checksums, no integrity testing
- [ ] **No restore testing procedure** — no documented restore process
- [ ] **No backup status tracking** — no database table for backup records
- [ ] **No cross-region replication** — single backup location only

**Files to change:**
- `scripts/backup.ts` — add checksums, verification, structured output
- `scripts/backup-verify.ts` — NEW: verify backup integrity
- `scripts/backup-restore.ts` — NEW: restore from backup
- `app/api/admin/backups/route.ts` — NEW: backup status API
- `prisma/schema.prisma` — add `BackupRecord` model

### 5. Scaling (Audit: 20/100 → Target: 80/100)

**Already exists:**
- ✅ Database connection pooling (Prisma)
- ✅ Redis caching with memory fallback
- ✅ Rate limiting on search
- ✅ ISR for composition pages

**Still missing:**
- [ ] **No cache invalidation on writes** — cache becomes stale when content is updated
- [ ] **No circuit breakers** — database failures cascade
- [ ] **No read replica routing** — all queries hit primary
- [ ] **No job queue dead letter queue** — failed jobs lost
- [ ] **No connection pool monitoring** — can't detect pool exhaustion

**Files to change:**
- `src/lib/cache-invalidation.ts` — NEW: invalidate cache on writes
- `src/lib/circuit-breaker.ts` — NEW: circuit breaker for external services
- `src/lib/db-monitor.ts` — NEW: connection pool metrics

### 6. Testing (Audit: 25/100 → Target: 80/100)

**Already exists:**
- ✅ Canonical matching tests
- ✅ Fuzzy algorithm unit tests
- ✅ Playwright dependency installed

**Still missing:**
- [ ] **No CI/CD pipeline** — no `.github/workflows/`
- [ ] **No integration tests for API endpoints**
- [ ] **No E2E tests for critical user flows**
- [ ] **No test coverage reporting**
- [ ] **No load testing**

**Files to change:**
- `.github/workflows/ci.yml` — NEW: CI pipeline (lint, typecheck, test, build)
- `.github/workflows/deploy.yml` — NEW: deployment pipeline
- `tests/integration/auth.test.ts` — NEW: auth flow tests
- `tests/integration/api.test.ts` — NEW: API endpoint tests
- `tests/e2e/critical-flows.test.ts` — NEW: Playwright E2E tests

### 7. Content Management (Audit: 45/100 → Target: 85/100)

**Already exists:**
- ✅ Full CRUD, canonical dedup, festival relationships, category hierarchy
- ✅ Knowledge graph with confidence scoring

**Still missing:**
- [ ] **No soft delete** — compositions hard-deleted
- [ ] **No content scheduling** — publish immediately only
- [ ] **No bulk import/export APIs**
- [ ] **No content archiving**

**Files to change:** (lower priority — these are feature gaps, not security/infra)

### 8. Search (Audit: 35/100 → Target: 85/100)

**Already exists:**
- ✅ Meilisearch + hybrid search + phonetic + semantic
- ✅ Redis caching with memory fallback
- ✅ Popularity ranking

**Still missing:**
- [ ] **No search failover to database** — total outage if Meilisearch down
- [ ] **No search analytics**
- [ ] **No query suggestions/autocomplete**

**Files to change:**
- `src/lib/search-client.ts` — add database fallback when Meilisearch unavailable

### 9. Moderation (Audit: 40/100 → Target: 80/100)

**Already exists:**
- ✅ 3-tier moderation workflow, vote system, correction system

**Still missing:**
- [ ] **No user reporting endpoint**
- [ ] **No spam detection**
- [ ] **No moderator audit trail**

---

## Implementation Priority (by audit score impact)

### P0 — Critical Security (Day 1)
1. Fix CSRF enforcement (return 403)
2. Add password complexity to registration
3. Add change-password endpoint
4. Sanitize .env (create .env.example)
5. Add input sanitization

### P1 — Error Tracking + Logging (Day 2)
6. Add Sentry integration
7. Add structured JSON logger
8. Add request ID to middleware

### P2 — Backup Hardening (Day 3)
9. Add checksums to backup
10. Add backup verification script
11. Add backup restore script
12. Add BackupRecord schema + API

### P3 — CI/CD + Testing (Day 4-5)
13. Add GitHub Actions CI workflow
14. Add integration tests for auth
15. Add E2E tests for critical paths
16. Add test coverage reporting

### P4 — Scaling (Day 6)
17. Add cache invalidation on writes
18. Add circuit breaker for external services
19. Add database fallback for search

### P5 — Monitoring (Day 7)
20. Add /api/metrics endpoint
21. Add connection pool monitoring
22. Document backup restore procedures

---

## Constraints

- **No new databases** — use existing Prisma/PostgreSQL for all new tables
- **No new infrastructure** — everything must work within existing Vercel/CockroachDB stack
- **Minimal dependencies** — only add @sentry/nextjs (already popular), nothing exotic
- **Backward compatible** — all changes must not break existing functionality
- **Marathi-first** — error messages in Marathi where user-facing
- **TypeScript strict** — no `as any` in new code, proper types everywhere
