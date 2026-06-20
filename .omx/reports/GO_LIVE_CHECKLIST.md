# Go Live Checklist
Digital Pandharpur Platform — Pre-Launch Requirements

## BLOCKERS (Must fix before ANY production launch)

### Security - Critical
- [ ] **Fix hardcoded secrets in auth.ts:111** - `NEXTAUTH_SECRET` defaults to 'pandharpur-warkari-default-secret-key-change-in-prod'
- [ ] **Fix hardcoded API keys in scrape route.ts:11** - `SCRAPE_API_KEY` defaults to 'dev-key-change-in-production'
- [ ] **Fix hardcoded worker secret in workers/process route.ts:8** - `WORKER_SECRET_KEY` defaults to 'dev-worker-secret'
- [ ] **Add Content Security Policy headers** - Missing CSP allows XSS
- [ ] **Add CSRF protection middleware** - Sessions can be hijacked
- [ ] **Implement file upload validation** - Arbitrary files can be uploaded
- [ ] **Add password complexity requirements** - Weak passwords allowed
- [ ] **Enable rate limiting on auth endpoints** - Brute force attacks possible
- [ ] **Remove mock OCR fallback** - Mock data could leak to production
- [ ] **Add security headers middleware** - Missing HSTS, X-Frame-Options, X-Content-Type-Options

### Monitoring - Critical
- [ ] **Implement /api/health endpoint** - Load balancers cannot check service health
- [ ] **Add error tracking (Sentry/DataDog)** - Crashes undetected
- [ ] **Implement structured JSON logging** - Debug logs not searchable
- [ ] **Add Prometheus metrics endpoint** - No SLO/SLA tracking
- [ ] **Set up alerting channels** - Incidents go unnoticed
- [ ] **Add database connection health checks** - No visibility into DB issues

### Backups - Critical
- [ ] **Implement automated database backups** - Data loss on corruption
- [ ] **Implement media/file backups** - OCR uploads lost on server failure
- [ ] **Document restore procedures** - No disaster recovery plan
- [ ] **Test backup restoration** - Untested recovery procedures

## HIGH PRIORITY (Must fix before public launch)

### Infrastructure
- [ ] **Set up staging environment** - Changes tested in production
- [ ] **Implement blue-green deployment** - Downtime on deploys
- [ ] **Add CDN for static assets** - Slow global delivery
- [ ] **Configure HTTPS redirects** - Mixed content warnings
- [ ] **Set up WAF rules** - Bot attacks unmitigated
- [ ] **Implement database read replicas** - Read scaling blocked

### Moderation
- [ ] **Add user reporting endpoint** - Users cannot flag abusive content
- [ ] **Implement auto-flagging for spam** - Spam could pollute corpus
- [ ] **Add image moderation** - NSFW/violent content uploads
- [ ] **Implement reputation decay** - Inactive users keep high reputation
- [ ] **Add IP ban management** - Malicious IPs not blockable

### Scaling
- [ ] **Add connection pool circuit breakers** - DB overload crashes
- [ ] **Implement cache invalidation** - Stale search results
- [ ] **Add job queue dead letter queue** - Failed jobs lost
- [ ] **Set up read replica routing** - Primary DB overloaded

## MEDIUM PRIORITY (Must fix within 30 days of launch)

- [ ] **Add /api/users/me endpoints** - No user profile management
- [ ] **Implement audit trail logging** - No security event tracking
- [ ] **Add feature flags system** - Cannot disable features without deploy
- [ ] **Implement email notifications** - No email delivery system
- [ ] **Add sitemap.xml generation** - SEO visibility limited
- [ ] **Add performance budget limits** - Pages can be slow
- [ ] **Implement graceful shutdown** - Killed requests in-flight
- [ ] **Add backup retention policies** - Indefinite storage costs
- [ ] **Document runbooks** - No incident response docs
- [ ] **Add API versioning** - Breaking changes without migration path

## LOW PRIORITY (Technical debt - plan for future)

- [ ] **Add two-factor authentication** - Admin accounts at risk
- [ ] **Implement passwordless auth** - Better UX/security
- [ ] **Add SAML/OAuth for organizations** - Enterprise adoption
- [ ] **Add admin bulk import/export** - Content migration tools
- [ ] **Implement webhook system** - External integrations
- [ ] **Add GraphQL endpoint** - API flexibility
- [ ] **Add offline PWA support** - Mobile experience limited

## Environment Variables Required (No defaults allowed in prod)

| Variable | Purpose | Current Status |
|----------|---------|----------------|
| DATABASE_URL | PostgreSQL connection | Required, no default |
| NEXTAUTH_SECRET | Session encryption | Has dangerous default |
| GOOGLE_CLIENT_ID | Google OAuth | Has mock default |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | Has mock default |
| SCRAPE_API_KEY | Scraping auth | Has dev default |
| WORKER_SECRET_KEY | Worker auth | Has dev default |
| UPSTASH_REDIS_REST_URL | Rate limiting cache | Falls back to memory |
| UPSTASH_REDIS_REST_TOKEN | Redis token | Falls back to memory |
| MEILI_HOST | Search host | Falls back to localhost |
| MEILI_MASTER_KEY | Search API key | Empty string default |
| GOOGLE_VISION_API_KEY | OCR service | Falls back to mock |
| LLM_API_KEY | AI enrichment | Falls back to mock |
| SENTRY_DSN | Error tracking | MISSING ENTIRELY |

## Estimated Time to Production Ready: 60-90 days

### Week 1-2: Security Hardening
- Remove all hardcoded secrets
- Add CSP, CSRF, security headers
- Implement file validation

### Week 3-4: Monitoring & Backups
- Add health checks, metrics, error tracking
- Set up backup automation and test restore

### Week 5-6: Scaling & Infrastructure
- CDN, staging, deployment automation
- Connection pool limits, circuit breakers

### Week 7-8: Moderation & UX
- User reporting, spam detection
- Profile management, notifications

### Week 9-12: Testing & Launch
- Full end-to-end testing
- Performance testing, load testing
- Gradual rollout with rollback plan