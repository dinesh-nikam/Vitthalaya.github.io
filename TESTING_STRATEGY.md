# Enterprise Testing Strategy - Digital Pandharpur

## 1. Test Strategy

### Testing Philosophy
- **Shift-left testing**: Tests written alongside features in development cycle
- **Defense in depth**: Multiple layers of validation (unit → integration → E2E → production)
- **Security-first**: OWASP Top 10 coverage mandatory for all API endpoints
- **Accessibility baseline**: WCAG 2.1 AA compliance required before merge
- **Performance budgets**: P95 < 200ms for API, P95 < 3s for page load
- **Marathi-first**: All text processing and search validated for Devanagari Unicode

### Testing Layers
| Layer | Tools | Coverage |
|-------|-------|----------|
| Unit | Bun test + React Testing Library | 80% line coverage minimum |
| Integration | Bun test + Prisma | Database/API integration |
| Contract | Zod schemas | All external API contracts |
| E2E | Playwright | Critical user flows |
| Accessibility | axe-core + manual | WCAG 2.1 AA compliance |
| Security | OWASP ZAP + custom | Top 10 + devotional-specific |
| Performance | k6 + Lighthouse | Load and speed budgets |
| Production | Sentry + New Relic | Real-user monitoring |

---

## 2. Test Matrix

| Category | Subcategory | Test Count | Priority | Framework |
|----------|-------------|------------|----------|-----------|
| Authentication | Registration/Login | 45 | Critical | E2E + Unit |
| Authentication | Session Management | 32 | Critical | Integration |
| Search | Devanagari/Transliteration | 87 | Critical | Unit + E2E |
| Scraper | Extraction/Metadata | 56 | High | Integration |
| Canonicalization | Deduplication | 63 | High | Unit |
| Knowledge Graph | Relationships | 78 | High | Integration |
| AI Pipeline | Generation/Audit | 44 | Medium | Unit |
| Audio | Matching/Quality | 38 | Medium | Integration |
| API | CRUD/Error Handling | 102 | Critical | Unit |
| Database | Constraints/Migrations | 67 | Critical | Integration |
| Security | OWASP/API Abuse | 89 | Critical | E2E + PenTest |
| Performance | Load/Stress | 41 | High | k6 |
| SEO | Structured Data | 28 | Medium | Unit |
| Accessibility | WCAG/Keyboard | 55 | High | axe-core |
| Mobile | Responsiveness | 43 | High | Playwright |
| Disaster Recovery | Recovery/Backup | 18 | High | Manual |

**Total Test Scenarios: 755+**

---

## 3. Functional Test Cases

### 3.1 Authentication Tests

#### Registration (TC-AUTH-001 to TC-AUTH-045)
| ID | Description | Input | Expected | Priority |
|----|-------------|-------|----------|----------|
| TC-AUTH-001 | Valid registration with email | name, email, password | 201 Created, verification email sent | Critical |
| TC-AUTH-002 | Missing required fields | {email} only | 400 Bad Request, validation error | Critical |
| TC-AUTH-003 | Invalid email format | test@invalid | 400 Bad Request, email validation error | Critical |
| TC-AUTH-004 | Password too short | 4 chars | 422 Unprocessable, min 8 chars error | Critical |
| TC-AUTH-005 | Password missing complexity | no numbers/symbols | 422 Weak password error | High |
| TC-AUTH-006 | Duplicate email registration | existing email | 409 Conflict error | Critical |
| TC-AUTH-007 | Marathi names in profile | "दिनेश निकम" | Stored correctly, no encoding issues | High |
| TC-AUTH-008 | Email already verified | verified email re-register | 400 Email already exists | Medium |
| TC-AUTH-009 | Rate limiting on registration | 20 req/min | 429 Too Many Requests | High |
| TC-AUTH-010 | Registration with Unicode emoji | 🚩 in password | Accepted if allowed by policy | Low |
| TC-AUTH-011 | Social login - Google | OAuth callback | Account created/linked, session established | Critical |
| TC-AUTH-012 | Social login - OAuth error | OAuth denied | 400 Bad Request, graceful error | Medium |
| TC-AUTH-013 | Account lockout after 5 failed logins | 5 wrong passwords | 423 Locked, email notification sent | Critical |
| TC-AUTH-014 | Unlock after lockout period | wait 30 min | Login succeeds | Medium |
| TC-AUTH-015 | Refresh token rotation | 30 min expiry | New refresh token issued, old revoked | Critical |
| TC-AUTH-016 | Refresh token theft detection | stolen token used | Both tokens revoked, re-auth required | Critical |
| TC-AUTH-017 | Concurrent session limit | 3 devices max | 403 when exceeded | Medium |
| TC-AUTH-018 | Session expiry handling | expired token | 401 Unauthorized, silent refresh attempt | Critical |
| TC-AUTH-019 | Logout revokes all sessions | logout called | All refresh tokens invalidated | Critical |
| TC-AUTH-020 | Password reset flow | valid email | Reset link sent with 1hr expiry | Critical |
| TC-AUTH-021 | Invalid reset token | tampered token | 400 Invalid token error | Critical |
| TC-AUTH-022 | Reset token expiry | 1hr+ old | 400 Token expired error | Medium |
| TC-AUTH-023 | Email change requires re-verification | new email | Old email verified on change | High |
| TC-AUTH-024 | Multi-factor auth enable | TOTP secret | QR code displayed, backup codes generated | High |
| TC-AUTH-025 | MFA login required | mfa enabled | TOTP prompt on login | High |
| TC-AUTH-026 | MFA recovery codes | backup codes | Single-use codes, 10 provided | Medium |

#### Login (TC-AUTH-027 to TC-AUTH-045)
| ID | Description | Expected | Priority |
|----|-------------|----------|----------|
| TC-AUTH-027 | Valid credentials | Session cookie + JWT | Critical |
| TC-AUTH-028 | Wrong password | 401 Invalid credentials | Critical |
| TC-AUTH-029 | Unverified email | 403 Email not verified | Critical |
| TC-AUTH-030 | Locked account | 423 Account locked | Critical |
| TC-AUTH-031 | Non-existent email | Generic 401 (no user enumeration) | Security |
| TC-AUTH-032 | SQL injection in email | No DB error, 400 validation | Security |
| TC-AUTH-033 | XSS in password field | Sanitized, not stored | Security |
| TC-AUTH-034 | Remember me duration | 30 days vs 7 days | Medium |
| TC-AUTH-035 | Concurrent refresh token limit | Max 5 active | High |

### 3.2 User Profile Tests (TC-PROFILE-001 to TC-PROFILE-040)

| ID | Description | Expected | Priority |
|----|-------------|----------|----------|
| TC-PROFILE-001 | Update profile with Marathi name | Name stored correctly | Critical |
| TC-PROFILE-002 | Update with long biography | 422 if > 1000 chars | High |
| TC-PROFILE-003 | Avatar upload - valid image | Image resized, stored, CDN URL | High |
| TC-PROFILE-004 | Avatar upload - too large | 413 Payload Too Large | Medium |
| TC-PROFILE-005 | Avatar upload - invalid format | 400 Invalid image type | Medium |
| TC-PROFILE-006 | Avatar upload - SVG XSS | Image rejected or sanitized | Security |
| TC-PROFILE-007 | Save bookmark to composition | Bookmark persisted, appears in /collections | Critical |
| TC-PROFILE-008 | Bookmark duplicate composition | Second bookmark ignored | Medium |
| TC-PROFILE-009 | Bookmark deleted composition | Bookmark hidden but preserved | Medium |
| TC-PROFILE-010 | Create collection | Collection saved with metadata | Critical |
| TC-PROFILE-011 | Collection with Marathi title | Unicode handled correctly | High |
| TC-PROFILE-012 | Add composition to collection | Junction record created | Critical |
| TC-PROFILE-013 | Duplicate in collection | Ignored silently | Medium |
| TC-PROFILE-014 | Share collection | Share token generated | High |
| TC-PROFILE-015 | Update preferences - dark mode | Preference persisted | Medium |
| TC-PROFILE-016 | Update preferences - language | i18n language set | High |
| TC-PROFILE-017 | Avatar - transparent PNG | Handled correctly | Low |
| TC-PROFILE-018 | Avatar - animated GIF | Accepted or rejected per policy | Medium |
| TC-PROFILE-019 | Profile race condition | Last write wins, conflict detected | Integration |
| TC-PROFILE-020 | Profile export | JSON export of user data | High |

### 3.3 Search Tests (TC-SEARCH-001 to TC-SEARCH-087)

#### Devanagari Search
| ID | Query | Expected | Priority |
|----|-------|----------|----------|
| TC-SEARCH-001 | "विठ्ठल" | Returns compositions with विठ्ठल | Critical |
| TC-SEARCH-002 | "Vitthal" | Returns same as "विठ्ठल" | Critical |
| TC-SEARCH-003 | "तुकाराम" | Saint + compositions | Critical |
| TC-SEARCH-004 | "Tukaram Maharaj" | Same results as above | Critical |
| TC-SEARCH-005 | "अव" (partial) | No-match (too short) | Medium |
| TC-SEARCH-006 | "अभंग" | All abhang type compositions | High |
| TC-SEARCH-007 | "आरती" | All aarti compositions | High |
| TC-SEARCH-008 | "शिव" | Deity + related compositions | High |
| TC-SEARCH-009 | "उभंग" | Returns "उपस्थापन" suggestions | Medium |
| TC-SEARCH-010 | "शिवाय" | Returns "ओं नमः शिवाय" | Critical |

#### Fuzzy/Misspelled Search
| ID | Query | Note | Priority |
|----|-------|------|----------|
| TC-SEARCH-011 | "विठठल" (misspelled) | Should still match विठ्ठल | High |
| TC-SEARCH-012 | "शिवाय" vs "शिवाये" | Variant matching | Medium |
| TC-SEARCH-013 | "तुकारम" vs "तुकाराम" | Soundex-like matching | High |
| TC-SEARCH-014 | "वारकरी" | Should match वारकरीची | High |
| TC-SEARCH-015 | "अष्टहंत" vs "अष्टहंत" | Diacritic difference | High |
| TC-SEARCH-016 | "शिव" vs "शंकर" | Different deities, not related | Medium |

#### Special Characters/Security
| ID | Query | Expected | Priority |
|----|-------|----------|----------|
| TC-SEARCH-017 | "<script>alert(1)</script>" | Sanitized, no XSS | Security |
| TC-SEARCH-018 | "'; DROP TABLE--" | Parameterized, no SQLi | Security |
| TC-SEARCH-019 | Empty string ("") | Returns empty results | Medium |
| TC-SEARCH-020 | 1000+ char query | 400 Bad Request | Medium |
| TC-SEARCH-021 | Unicode emoji in query | Handled gracefully | Low |
| TC-SEARCH-022 | Zero-width characters | Stripped or rejected | Security |
| TC-SEARCH-023 | Right-to-left override | Neutralized | Security |

#### Filters & Sorting
| ID | Filter | Expected | Priority |
|----|--------|----------|----------|
| TC-SEARCH-024 | ?type=abhang | Only abhang results | Critical |
| TC-SEARCH-025 | ?deity=विठ्ठल | Vitthal compositions | Critical |
| TC-SEARCH-026 | ?saint=तुकाराम | Tukaram's works | Critical |
| TC-SEARCH-027 | ?festival=अषाडी | Ashadhi Ekadashi related | High |
| TC-SEARCH-028 | ?hasAudio=true | Only with audio links | High |
| TC-SEARCH-029 | Sort by relevance | Default | Critical |
| TC-SEARCH-030 | Sort by date created | Newest first | Medium |
| TC-SEARCH-031 | Pagination offset | Correct next/prev links | Critical |
| TC-SEARCH-032 | Pagination limit | Max 100 per page | Medium |

#### Unicode Normalization Edge Cases
| ID | Input | Expected | Priority |
|----|-------|----------|----------|
| TC-SEARCH-033 | "विठ्ठल" (standard) | Baseline match | Critical |
| TC-SEARCH-034 | "विठठल" (variant) | Should match | High |
| TC-SEARCH-035 | "उं" vs "उॅ" (combining marks) | Same glyph | High |
| TC-SEARCH-036 | "आदि" composed vs decomposed | Same results | High |
| TC-SEARCH-037 | Mixed Devanagari/Latin query | Both tokenized | Critical |

### 3.4 Composition Page Tests (TC-COMP-001 to TC-COMP-120)

#### Core Content
| ID | Description | Expected | Priority |
|----|-------------|----------|----------|
| TC-COMP-001 | Render Devanagari title | Correct display, no boxes | Critical |
| TC-COMP-002 | Render lyrics with line breaks | Preserved formatting | Critical |
| TC-COMP-003 | Metadata - Saint link | Clickable saint name | Critical |
| TC-COMP-004 | Metadata - Deity link | Clickable deity name | Critical |
| TC-COMP-005 | Metadata - Festival links | Multiple festivals shown | High |
| TC-COMP-006 | Metadata - Category tags | All categories listed | High |
| TC-COMP-007 | Show meaning section | Meaning displayed below lyrics | Critical |
| TC-COMP-008 | Missing meaning placeholder | "Meaning coming soon" | Medium |
| TC-COMP-009 | Audio embed - YouTube | iframe loads, plays | High |
| TC-COMP-010 | Audio embed - Invalid URL | Error state shown | Medium |
| TC-COMP-011 | Source attribution display | Source URL with link | Critical |
| TC-COMP-012 | Verified badge shown | Green check for reviewed=true | High |
| TC-COMP-013 | Unverified indicator | Gray badge for reviewed=false | Medium |
| TC-COMP-014 | Copy to clipboard | Text copied, toast shown | Medium |
| TC-COMP-015 | Print stylesheet | Print View button works | Medium |
| TC-COMP-016 | Dark mode toggle | Colors invert correctly | Medium |
| TC-COMP-017 | Reading mode | Large text, serif font | Medium |

### 3.5 Community Feature Tests (TC-COMMUNITY-001 to TC-COMMUNITY-080)

#### Contribution
| ID | Description | Expected | Priority |
|----|-------------|----------|----------|
| TC-COMMUNITY-001 | Submit new composition | reviewed=false set | Critical |
| TC-COMMUNITY-002 | Submit duplicate | Duplicate warning | High |
| TC-COMMUNITY-003 | Submit with AI metadata | AI enrichment triggered | Medium |
| TC-COMMUNITY-004 | Correction submission | Suggestion created | Critical |
| TC-COMMUNITY-005 | Vote on correction | Reputation update | High |
| TC-COMMUNITY-006 | Too many votes same IP | Rate limited | Medium |
| TC-COMMUNITY-007 | Translation submission | Translation record created | High |
| TC-COMMUNITY-008 | Annotation on verse | Verse-level annotation | Medium |
| TC-COMMUNITY-009 | Collection sharing | Shareable link generated | Medium |
| TC-COMMUNITY-010 | Anonymous contribution | Allowed per policy | High |

#### Reputation Gaming Prevention
| ID | Description | Expected | Priority |
|----|-------------|----------|----------|
| TC-COMMUNITY-011 | Self-vote detection | Vote rejected | Security |
| TC-COMMUNITY-012 | Bot-like voting pattern | IP throttled | Security |
| TC-COMMUNITY-013 | Multiple accounts voting | Account correlation flagged | Security |
| TC-COMMUNITY-014 | Reputation threshold for actions | 100+ for edit, 500+ for approve | Critical |

### 3.6 Moderation Tests (TC-MOD-001 to TC-MOD-040)

| ID | Description | Expected | Priority |
|----|-------------|----------|----------|
| TC-MOD-001 | Approve composition | reviewed=true | Critical |
| TC-MOD-002 | Reject with reason | Status set to rejected | Critical |
| TC-MOD-003 | Edit during moderation | Changes logged | Medium |
| TC-MOD-004 | Escalate to senior mod | Flag raised | High |
| TC-MOD-005 | Audit log entry | All actions logged | Critical |
| TC-MOD-006 | Bulk approve | All marked reviewed | Medium |
| TC-MOD-007 | Moderator permissions | RBAC enforced | Security |
| TC-MOD-008 | Non-moderator approve | 403 Forbidden | Security |

---

## 4. Integration Test Cases

### 4.1 Scraper Integration (TC-SCRAPER-001 to TC-SCRAPER-080)

#### Extraction Quality
| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| TC-SCRAPER-001 | Marathi text extraction | Unicode preserved | Critical |
| TC-SCRAPER-002 | Metadata missing field | Null/undefined handled | High |
| TC-SCRAPER-003 | Verse boundary detection | Complete verses extracted | Critical |
| TC-SCRAPER-004 | OCR error correction | "विठठल" → "विठ्ठल" | High |
| TC-SCRAPER-005 | Duplicate across sources | Canonical merging triggered | Critical |

#### Recovery & Retry
| ID | Scenario | Expected | Priority |
|----|----------|----------|----------|
| TC-SCRAPER-006 | Site timeout (10s) | Retry 3x, then queue | High |
| TC-SCRAPER-007 | Connection refused | Exponential backoff | Medium |
| TC-SCRAPER-008 | HTTP 500 | Retry with jitter | Medium |
| TC-SCRAPER-009 | Partial failure in batch | Continue, log error | High |
| TC-SCRAPER-010 | Resume after crash | Last offset restored | Critical |

### 4.2 Canonicalization Engine (TC-CANON-001 to TC-CANON-063)

| ID | Scenario | Input A | Input B | Expected | Priority |
|----|----------|---------|---------|----------|----------|
| TC-CANON-001 | Exact duplicate | Same text | Same text | Merge score 1.0 | Critical |
| TC-CANON-002 | OCR variant | "विठ्ठल" | "विठठल" | Merge score 0.85 | Critical |
| TC-CANON-003 | Whitespace diff | "  श्लोक  " | "श्लोक" | Merge score 0.95 | Medium |
| TC-CANON-004 | Line break diff | "मी ओं" | "मी\nओं" | Merge score 0.99 | Medium |
| TC-CANON-005 | Extra verse | Full abhang | Missing last verse | Score 0.7 | High |
| TC-CANON-006 | Missing verse | Full abhang | Extra verse inserted | Score 0.6 | High |

### 4.3 Knowledge Graph (TC-GRAPH-001 to TC-GRAPH-078)

| ID | Relationship | Expected | Priority |
|----|--------------|----------|----------|
| TC-GRAPH-001 | Saint → Composition exists | Edge created | Critical |
| TC-GRAPH-002 | Missing Saint reference | No edge created | Medium |
| TC-GRAPH-003 | Orphan Composition | Warning logged | High |
| TC-GRAPH-004 | Circular reference | Detected, prevented | Security |
| TC-GRAPH-005 | Graph traversal depth 3 | All paths returned | High |

---

## 5. API Test Cases

### 5.1 REST API Contract Tests (TC-API-001 to TC-API-200)

#### Authentication API
| ID | Endpoint | Method | Expected | Priority |
|----|----------|--------|----------|----------|
| TC-API-001 | /api/auth/register | POST | 201 + email verification | Critical |
| TC-API-002 | /api/auth/login | POST | 200 + cookie set | Critical |
| TC-API-003 | /api/auth/logout | POST | 200 + cookie cleared | Critical |
| TC-API-004 | /api/auth/refresh | POST | 200 + new tokens | Critical |

#### Composition API
| ID | Endpoint | Method | Expected | Priority |
|----|----------|--------|----------|----------|
| TC-API-005 | /api/compositions | GET | 200 + paginated | Critical |
| TC-API-006 | /api/compositions/:id | GET | 200 + full object | Critical |
| TC-API-007 | /api/compositions/slug/:slug | GET | 200 + composition | Critical |
| TC-API-008 | /api/compositions | POST | 201 if moderator else 403 | Security |

#### Search API
| ID | Endpoint | Expected | Priority |
|----|----------|----------|----------|
| TC-API-009 | /api/search?q=विठ्ठल | 200 + Marathi results | Critical |
| TC-API-010 | /api/search?q=viTthal | 200 + translit results | Critical |
| TC-API-011 | /api/search?type=invalid | 400 validation error | Medium |

#### Error Codes
| ID | Error | Response | Priority |
|----|-------|----------|----------|
| TC-API-012 | Invalid JWT | 401 Unauthorized | Critical |
| TC-API-013 | Expired session | 401 + refresh attempt | Critical |
| TC-API-014 | Missing permissions | 403 Forbidden | Critical |
| TC-API-015 | Rate limited | 429 with Retry-After | High |
| TC-API-016 | Malformed JSON | 400 with error details | Medium |

---

## 6. Security Test Cases

### 6.1 OWASP Top 10 Coverage (TC-SEC-001 to TC-SEC-120)

#### Injection (TC-SEC-001 to TC-SEC-030)
| ID | Attack Vector | Mitigation | Priority |
|----|---------------|------------|----------|
| TC-SEC-001 | SQL: ' OR 1=1-- | Prisma parameterized queries | Critical |
| TC-SEC-002 | SQL: ; DROP TABLE | Transaction rollback | Critical |
| TC-SEC-003 | NoSQL: {$gt: ""} | Zod validation | Critical |
| TC-SEC-004 | Command injection | No shell exec | Critical |

#### XSS (TC-SEC-031 to TC-SEC-050)
| ID | Vector | Mitigation | Priority |
|----|--------|------------|----------|
| TC-SEC-031 | <script> in composition | Content sanitization | Critical |
| TC-SEC-032 | onerror=alert(1) | Attribute stripping | Critical |
| TC-SEC-033 | javascript: URL | Protocol whitelist | Critical |
| TC-SEC-034 | SVG XSS | Sanitize XML | Critical |

#### Authentication Abuse (TC-SEC-051 to TC-SEC-080)
| ID | Attack | Mitigation | Priority |
|----|--------|------------|----------|
| TC-SEC-051 | Brute force login | Rate limiting + lockout | Critical |
| TC-SEC-052 | JWT tampering | Signature verify | Critical |
| TC-SEC-053 | Refresh token replay | Token revocation | Critical |
| TC-SEC-054 | Session fixation | New session on auth | Critical |

### 6.2 Marathi-Specific Security (TC-SEC-081 to TC-SEC-089)

| ID | Attack | Expected | Priority |
|----|--------|----------|----------|
| TC-SEC-081 | Unicode homograph "віттгал" | Detected as non-Marathi | Medium |
| TC-SEC-082 | Right-to-left override in title | Neutralized | Security |
| TC-SEC-083 | Zero-width in search | Stripped | Security |
| TC-SEC-084 | Combining marks attack | Normalized | Security |

---

## 7. Performance Test Cases

### 7.1 Load Scenarios (TC-PERF-001 to TC-PERF-041)

| ID | Scenario | Users | P95 Target | Priority |
|----|----------|-------|------------|----------|
| TC-PERF-001 | Homepage load | 1,000 | < 1s | Critical |
| TC-PERF-002 | Search query | 1,000 | < 200ms | Critical |
| TC-PERF-003 | Composition page | 10,000 | < 500ms | Critical |
| TC-PERF-004 | API burst (100 req/s) | 100 | < 300ms | High |
| TC-PERF-005 | Concurrent scrapes | 10 | No DB deadlock | High |

### 7.2 Database Performance
| ID | Query | Rows | P95 Target | Priority |
|----|-------|------|------------|----------|
| TC-PERF-006 | Count compositions by saint | 50K | < 100ms | Critical |
| TC-PERF-007 | Graph traversal depth 3 | 1M edges | < 300ms | High |
| TC-PERF-008 | Full-text search Marathi | 100K docs | < 150ms | Critical |

---

## 8. Disaster Recovery Tests (TC-DR-001 to TC-DR-018)

| ID | Failure | Recovery Action | RTO Target | Priority |
|----|---------|-----------------|------------|----------|
| TC-DR-001 | Database primary down | Failover to replica | < 5 min | Critical |
| TC-DR-002 | Meilisearch down | Fallback to DB search | < 30s | High |
| TC-DR-003 | Backup restore | PITR to last snapshot | < 1 hour | Critical |
| TC-DR-004 | CDN failure | Origin serve | < 1 min | Medium |

---

## 9. Automation Strategy

### 9.1 Test Distribution
```
bun test                    # Unit tests (run on every save)
bun test:integration          # Integration (pre-commit)
bun test:e2e                # Playwright (CI on PR)
bun test:security           # OWASP ZAP scan (nightly)
bun test:a11y               # axe-core (CI)
bun test:perf               # k6 load test (nightly)
```

### 9.2 CI/CD Pipeline
```yaml
# On push to any branch
1. TypeScript compile check
2. ESLint on changed files
3. Unit tests (bun test) --runInBand
4. Integration tests (bun test:integration)

# On PR merge to main
5. Full E2E suite (Playwright)
6. Security scan (OWASP ZAP)
7. Accessibility audit (axe)
8. Performance smoke test (k6)
9. Deploy to staging
10. Smoke tests on staging
```

---

## 10. CI/CD Quality Gates

| Gate | Requirement | Tool | Block Merge? |
|------|-------------|------|--------------|
| Compile | No TypeScript errors | tsc | ✅ |
| Lint | Max warning threshold 0 | ESLint | ✅ |
| Unit | Min 80% line coverage | bun:test | ✅ |
| E2E | All critical flows pass | Playwright | ✅ |
| Security | No HIGH/CRITICAL issues | OWASP ZAP | ✅ |
| Accessibility | WCAG 2.1 AA | axe-core | ✅ |
| Performance | P95 < 200ms API, < 3s page | k6 | ✅ |
| Manual QA | Stakeholder sign-off | Checklist | ✅ |

---

## 11. Production Readiness Checklist

- [ ] **Security**: All OWASP Top 10 addressed, API keys rotated
- [ ] **Monitoring**: Sentry error tracking, response time alerts configured
- [ ] **Logging**: Structured JSON logs with request IDs for all endpoints
- [ ] **Backups**: Daily DB snapshots, search index backup
- [ ] **Alerting**: PagerDuty integration, SLA breach alerts
- [ ] **Compliance**: GDPR data export/delete, content attribution logged
- [ ] **Data Quality**: All seed content verified, Unicode tested
- [ ] **SEO**: Sitemap generated, canonical URLs correct, mobile-friendly
- [ ] **Scalability**: Database indexes verified, rate limiting active
- [ ] **Disaster Recovery**: Backup restore tested, runbook documented

---

## Appendix A: Test Data Requirements

### Marathi Text Fixtures
- Devanagari samples for all composition types
- Mixed-script (Devanagari + English) test cases
- OCR-corrupted variants of known good texts
- Unicode normalization edge cases (NFD vs NFC)

### Saint Data
- Tukaram, Dnyaneshwar, Namdev, Eknath (verified content)
- Lesser-known saints for edge cases
- Saints with same/similar names

### Search Corpus
- 1,000+ compositions with varied metadata
- Intentional duplicates for canonical testing
- Multiple sources per composition