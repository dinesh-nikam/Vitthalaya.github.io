# Launch Risk Report
Digital Pandharpur Platform — Risk Assessment

## Executive Summary

**Overall Risk Rating: HIGH (🔴 BLOCKED FOR PRODUCTION)**

The platform has critical security vulnerabilities, no monitoring, no backups, and cannot scale. Immediate remediation required before any production launch.

---

## Risk Matrix

| Risk Category | Severity | Probability | Impact | Score |
|---------------|----------|-------------|--------|-------|
| Hardcoded Secrets | Critical | High | Catastrophic | 9 |
| No Backups | Critical | Medium | Catastrophic | 8 |
| No Monitoring | Critical | High | High | 8 |
| No Security Headers | Critical | High | High | 7 |
| Mock Fallback Data | Critical | High | Medium | 6 |
| No Rate Limit on Auth | High | High | Medium | 6 |
| Missing Test Coverage | High | Medium | Medium | 5 |

---

## Critical Risks (P0 - Immediate)

### 1. Hardcoded Default Secrets
**Risk:** Anyone can sign in as admin, trigger scrapers, impersonate workers

**Evidence:**
- `src/lib/auth.ts:111` - NEXTAUTH_SECRET = 'pandharpur-warkari-default-secret-key-change-in-prod'
- `app/api/scrape/route.ts:11` - SCRAPE_API_KEY = 'dev-key-change-in-production'  
- `app/api/workers/process/route.ts:8` - WORKER_SECRET_KEY = 'dev-worker-secret'

**Exploit Scenario:**
1. Attacker sees default secret in code (public repo)
2. Calls `/api/scrape` with default API key
3. Scrapes unlimited content, fills database with junk
4. Calls `/api/workers/process` to process fake jobs
5. Site performance degrades, content polluted

**Mitigation:** Remove ALL defaults, require env vars, fail fast if missing

### 2. No Backup System
**Risk:** Complete data loss on database corruption or operator error

**Evidence:**
- No backup scripts exist
- No pg_dump or similar configured
- Upload directory not persisted externally
- No S3/external storage for manuscripts

**Exploit Scenario:**
1. Admin accidentally runs destructive migration
2. Database corruption during traffic spike
3. Ransomware encrypts database
4. No way to recover - platform dead

**Mitigation:** Implement automated daily backups, test restore weekly

### 3. No Production Monitoring
**Risk:** Production incidents undetected for hours/days

**Evidence:**
- No /api/health endpoint
- No error tracking (Sentry, DataDog)
- No metrics export (Prometheus)
- No alerting configured
- String logs, not JSON structured

**Exploit Scenario:**
1. LLM provider rate limits cause cascade failure
2. No alerts - site gradually becomes unresponsive
3. Users abandon, reputation damaged
4. Team unaware until users complain

**Mitigation:** Add health checks, error tracking, metrics, alerts

---

## High Risks (P1 - Before Public Launch)

### 4. Mock OCR Fallback in Production
**Risk:** Fake devotional content published

**Evidence:**
- `src/lib/ocr.ts:64-109` - Returns hardcoded Marathi verses
- Triggered when GOOGLE_VISION_API_KEY missing
- Mock text looks legitimate to moderators

**Exploit Scenario:**
1. LLM/ocr API key expires or misconfig
2. Future uploads get mock "श्री विठ्ठल" text
3. Fake abhangs published, devotional integrity compromised
4. Cultural backlash, trust destroyed

**Mitigation:** Remove mock fallback, fail if OCR service unavailable

### 5. No Rate Limiting on Auth Endpoints
**Risk:** Account takeover via brute force

**Evidence:**
- Auth endpoints don't use ratelimiter
- Password attempts unlimited
- No account lockout after failures

**Exploit Scenario:**
1. Attacker targets `admin@warkari.org`
2. Scripts 1000 passwords per minute
3. No throttling, no lockout
4. Admin account compromised

**Mitigation:** Add exponential backoff, account lockout, CAPTCHA

### 6. Search Index Without Fallback
**Risk:** Search outage if Meilisearch down

**Evidence:**
- `src/lib/search-client.ts` - No fallback if Meili down
- `src/lib/opensearch-client.ts` - OpenSearch also required
- No index rebuilding procedures

**Exploit Scenario:**
1. Meilisearch crashes or corrupted
2. All search returns 500 errors
3. Users cannot find content
4. Site traffic drops 80%

**Mitigation:** Add fallback to database search, health checks

---

## Medium Risks (P2 - Within 30 Days)

### 7. Minimal Test Coverage
**Risk:** Regressions in production

**Evidence:**
- Only 1 test file: `src/canonical/__tests__/matching.test.ts`
- No integration tests for critical paths
- No E2E tests for user flows
- No load tests

**Exploit Scenario:**
1. Deploy removes bug fix
2. No tests catch regression
3. Production users see errors
4. Trust erodes

**Mitigation:** Add unit tests for all routes, integration tests, CI

### 8. No Security Headers
**Risk:** XSS, clickjacking, MIME sniffing attacks

**Evidence:**
- No CSP header set
- No X-Frame-Options
- No X-Content-Type-Options
- No HSTS

**Exploit Scenario:**
1. Attacker injects script via user correction
2. No CSP to block execution
3. Session tokens stolen
4. Accounts compromised

**Mitigation:** Add security headers middleware to all responses

---

## Dependency Risks

| Dependency | Version | Risk | Notes |
|------------|---------|------|-------|
| next | 15.0.0 | Medium | Latest, but breaking changes frequent |
| react | 19.0.0 | Medium | Very new, may have bugs |
| @prisma/client | 5.0.0 | Low | Stable, but upgrade path unclear |
| meilisearch | 0.58.0 | Medium | Memory issues under load reported |
| next-auth | 4.24.14 | Low | Stable, well-maintained |

---

## Infrastructure Risks

| Component | Risk | Notes |
|-----------|------|-------|
| Single server deployment | High | No horizontal scaling |
| Local storage for uploads | Critical | Disk full = data loss |
| No CDN | Medium | Slow global performance |
| No WAF | High | DDoS can take site down |
| No staging | Medium | Production testing |

---

## User Impact Assessment

| Risk | User Impact | Timeline |
|------|-------------|----------|
| Security breach | Account takeover, fake content | Immediate |
| Data loss | Complete content loss | Anytime |
| Performance degradation | Site slow/unavailable | Anytime |
| Search outage | Cannot find content | Anytime |
| Fake OCR content | Cultural integrity compromised | After first upload |

---

## Recommendations Priority

1. **STOP - Do not launch** until security blockers fixed
2. Implement monitoring before any user traffic
3. Add backup system before first data commit
4. Remove all mock/fallback code from production paths
5. Add comprehensive test coverage

## Sign-off Required

- [ ] CTO - Security posture approved
- [ ] Security Lead - Penetration test complete
- [ ] SRE Lead - Monitoring/alerting verified
- [ ] QA Lead - Test coverage > 80%
- [ ] Product Lead - Backup/DR tested