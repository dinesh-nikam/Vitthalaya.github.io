# Autonomous Content Discovery & Growth Engine

> **Goal**: Scale Vitthalaya from 360 compositions to 10K → 100K → 1M+ compositions
> through automated discovery, ethical scraping, community contribution, and AI-powered QC.

## Guiding Principles

1. **Ethical First** — Respect robots.txt, rate limits, copyright, attribution at all times.
2. **Quality Over Quantity** — Trust-scored sources, multi-engine OCR consensus, 3-tier moderation.
3. **Progressive Trust** — New sources start untrusted; trust score rises with verified contributions.
4. **Auditable Pipeline** — Every composition has a provenance trail (source → scraped → canonical → reviewed → published).
5. **Build on Existing** — Leverage existing scrapers (26), canonical engine, AI enrichment, knowledge graph, moderation queue.

---

## 1. Discovery Architecture

```
                        ┌─────────────────────────────┐
                        │     Discovery Orchestrator    │
                        │  (src/discovery/worker.ts)    │
                        └──────────┬──────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │  Source Discovery │ │  Content Fetch    │ │  Canonical Sync   │
   │  - Sitemap crawl  │ │  - Scraper exec   │ │  - Dedup check    │
   │  - BFS crawl      │ │  - Rate limiter   │ │  - Canonicalize   │
   │  - RSS feed       │ │  - Retry/backoff  │ │  - Merge variants  │
   │  - Community tip  │ │  - Format detect  │ │  - Confidence sc   │
   └──────────────────┘ └──────────────────┘ └──────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────────────┐
                        │   Post-Processing Pipeline   │
                        │  - AI enrichment (auto)     │
                        │  - Knowledge graph edges    │
                        │  - Search index update       │
                        │  - Quality scoring           │
                        └─────────────────────────────┘
```

### 1.1 Discovery Sources

| Source Type | Method | Example | Priority |
|---|---|---|---|
| Sitemap | Parse `/sitemap.xml`, discover content URLs | `santeknath.org/sitemap.xml` | High |
| RSS/Atom | Subscribe to feed, detect new posts | `blog` feeds | High |
| BFS Crawl | Start from seed URL, crawl same-domain pages | Cultural archive sites | Medium |
| YouTube | Channel/playlist discovery | Devotional channels | Medium |
| Community Tip | User-submitted URL → auto-analyze | "I found content at X" | High |
| Search Engine | Periodic queries for "marathi abhang" + new terms | Google/Bing API | Low |
| Existing Scrapers | Already-built scrapers (26 files) | tukaram-gatha, abhangvani | **Immediate** |

### 1.2 Discovery Orchestrator Flow

```typescript
// Pseudocode for the daily discovery run
async function discoveryCycle(): Promise<DiscoveryReport> {
  const sources = await SourceRegistry.getActive();
  const newContent: ScrapedItem[] = [];

  for (const source of sources) {
    const scraper = resolveScraper(source.type);
    const items = await scraper.discoverNew(source); // Only new/changed items
    newContent.push(...items);
    await SourceRegistry.recordFetch(source.id, items.length);
  }

  // Dedup & canonicalize
  const canonical = await canonicalEngine.processBatch(newContent);

  // Enrich
  await aiEnrichment.enqueueBatch(canonical.ids);

  // Graph edges
  await knowledgeGraph.buildEdgesForCompositions(canonical.ids);

  // Update search index
  await searchIndex.update(canonical.ids);

  return buildReport(sources, newContent, canonical);
}
```

---

## 2. Source Registry Design

### 2.1 Data Model

```typescript
interface ContentSource {
  id: string;                    // UUID
  name: string;                  // Human-readable name
  type: 'SITEMAP' | 'RSS' | 'WEBSITE' | 'YOUTUBE' | 'COMMUNITY' | 'SEARCH';
  url: string;                   // Root URL
  baseDomain: string;            // Extracted domain

  // Scraping configuration
  scraperType: string | null;    // Which scraper module to use (null = auto-detect)
  scrapeInterval: number;        // Hours between scrape runs
  rateLimit: number;             // Min ms between requests
  robotsTxt: string | null;      // Cached robots.txt content
  allowedPaths: string[];        // Globs for allowed paths
  excludedPaths: string[];       // Globs for excluded paths

  // Trust & Quality
  trustScore: number;            // 0.0–1.0 composite score
  totalCompositions: number;     // Total found from this source
  verifiedCompositions: number;  // Passed moderation
  errorRate: number;             // % of scrape attempts that fail
  lastFetchAt: Date | null;      // Last successful fetch
  lastErrorAt: Date | null;      // Last fetch error
  consecutiveErrors: number;     // Error streak (auto-disable after N)

  // Licensing
  license: string | null;        // Creative Commons, Public Domain, etc.
  requiresAttribution: boolean;
  attributionTemplate: string | null;

  // Status
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'BLOCKED';
  isAutoDiscovered: boolean;     // Found by discovery system vs manually added
  discoveredById: string | null; // User ID if community-submitted

  // Metadata
  tags: string[];                // e.g. ['abhang', 'marathi', 'sant-tukaram']
  language: string;              // Primary language
  region: string;                // Geographic/cultural region
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 Source Registry API

```typescript
class SourceRegistry {
  static getAll(filters?: SourceFilter): Promise<ContentSource[]>;
  static getById(id: string): Promise<ContentSource | null>;
  static getActive(): Promise<ContentSource[]>;  // Status=ACTIVE
  static create(config: CreateSourceInput): Promise<ContentSource>;
  static update(id: string, updates: Partial<ContentSource>): Promise<ContentSource>;
  static updateTrustScore(id: string): Promise<number>;  // Recalculate
  static recordSuccess(id: string, count: number): Promise<void>;
  static recordError(id: string, error: string): Promise<void>;
  static disableIfFailing(id: string): Promise<boolean>;  // Auto-disable
  static submitCommunityTip(url: string, userId: string): Promise<ContentSource>;
}
```

### 2.3 Initial Seed Sources

| Source | Type | Priority | Status |
|---|---|---|---|
| Existing 26 scrapers | Various | Immediate | ACTIVE |
| Wikisource-mr | SITEMAP | High | ACTIVE |
| Santeknath.org | SITEMAP | High | ACTIVE |
| Stotra Nidhi | SITEMAP | Medium | PENDING |
| Cultural.gov.in (archives) | SITEMAP | Medium | PENDING |
| Marathi Wikipedia | SITEMAP | Medium | PENDING |
| YouTube channels | YOUTUBE | Low | PENDING |
| Community submissions | COMMUNITY | High | ACTIVE |

---

## 3. Daily Discovery Jobs

### 3.1 Job Scheduler

```typescript
interface DiscoveryJob {
  id: string;
  sourceId: string;
  type: 'FULL_SYNC' | 'INCREMENTAL' | 'HEALTH_CHECK' | 'SOURCE_DISCOVERY';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: Date | null;
  completedAt: Date | null;
  itemsFound: number;
  itemsNew: number;
  itemsErrored: number;
  durationMs: number;
  errorLog: string[];
}
```

### 3.2 Job Execution Cycle

```
┌──────────────────────────────────────────────┐
│             Daily Scheduler                    │
│  (Cron: every 6 hours / configurable)         │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
         ┌───────────────────────┐
         │  1. Source Health     │ ← Check all ACTIVE sources
         │     Check             │    Disable if N consecutive errors
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  2. Content Fetch     │ ← Run scrapers in parallel (configurable concurrency)
         │     (parallel batch)  │    Respect rate limits per source
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  3. Canonical Sync    │ ← Dedup against existing records
         │     & Dedup           │    Create canonical records for new content
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  4. AI Enrichment     │ ← Enqueue for AI processing (async)
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  5. Graph & Index     │ ← Update knowledge graph edges
         │     Update            │    Rebuild search index
         └───────────────────────┘
```

### 3.3 Scheduler Implementation

```typescript
// src/discovery/scheduler.ts
export class DiscoveryScheduler {
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  async start(intervalMs = 6 * 60 * 60 * 1000): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.runCycle(); // Run immediately on start
    this.intervalId = setInterval(() => this.runCycle(), intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async runCycle(): Promise<DiscoveryReport> {
    // 1. Health check all sources
    // 2. Fetch new content from due sources
    // 3. Canonical sync
    // 4. AI enrichment
    // 5. Graph + search index updates
    // 6. Report
  }
}
```

### 3.4 API-Triggered Jobs

```typescript
// POST /api/discovery/run
// Manually trigger a discovery cycle
// Auth: admin only

// POST /api/discovery/run-source/:sourceId
// Run a specific source immediately

// GET /api/discovery/status
// Current scheduler status, last run, next run

// GET /api/discovery/history?limit=20&offset=0
// Historical discovery run reports
```

---

## 4. Scraper Health Monitoring

### 4.1 Metrics Collected Per Source

| Metric | Description | Threshold | Alert |
|---|---|---|---|
| `success_rate_7d` | % of successful scrapes over 7 days | < 80% | Warning |
| `consecutive_errors` | Sequential failures | ≥ 3 | Critical → auto-disable |
| `avg_response_time` | Mean HTTP response time | > 10s | Warning |
| `items_per_run` | Items found per scrape | trend down | Investigation |
| `error_distribution` | Breakdown of error types (timeout, 4xx, 5xx, parse) | — | Pattern alert |
| `dedup_rate` | % of items that are duplicates (already exist) | > 90% | Re-evaluate source |
| `moderation_pass_rate` | % of items passing Tier 1 moderation | < 50% | Quality alert |

### 4.2 Health Check System

```typescript
// src/discovery/scraper-monitor.ts
interface SourceHealth {
  sourceId: string;
  sourceName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILING' | 'DISABLED';
  lastCheckAt: Date;
  metrics: {
    successRate7d: number;
    consecutiveErrors: number;
    avgResponseTime: number;
    itemsPerRun: number;
    dedupRate: number;
    moderationPassRate: number;
  };
  recentErrors: Array<{
    at: Date;
    type: string;
    message: string;
  }>;
  recommendation: string; // e.g., "Auto-disabled after 5 consecutive errors"
}
```

### 4.3 Alert Channels

| Channel | When | How |
|---|---|---|
| Console log | All events | Structured JSON logging |
| Admin dashboard UI | Real-time | WebSocket or polling |
| Email alert | Critical events | SMTP (via resend/sendgrid) |
| Webhook | Configurable | POST to external monitoring |

### 4.4 Auto-Recovery

```typescript
async function autoRecover(sourceId: string): Promise<boolean> {
  // 1. Check if source is reachable
  // 2. Re-fetch robots.txt
  // 3. Test scrape a single page
  // 4. If success: re-enable source, reset error count
  // 5. If failure: increment wait time (exponential backoff)
  // 6. Notify admin if manual intervention needed
}
```

---

## 5. Community Contribution Pipeline

### 5.1 Contribution Flow

```
User Submission
      │
      ▼
┌──────────────────────┐
│  Format Validation   │ ← File type check, size limit, virus scan
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Multi-Engine OCR    │ ← Google Vision + Tesseract + PaddleOCR
│  (if scanned image)  │    Consensus voting for final text
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  AI Metadata Detect  │ ← Classify type, detect saint/deity, extract meaning
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Tier 1: AI Review   │ ← Content safety, coherence, quality
└──────────┬───────────┘
      PASS │    │ FAIL
           ▼    ▼
┌──────────────────┐  Reject (with reason)
│  Tier 2: Peer     │ ← Community moderators review
│  Review           │
└──────────┬───────┘
      PASS │    │ NEEDS_SCHOLAR
           ▼    ▼
    ┌──────────┐  ┌──────────────────┐
    │  Publish │  │ Tier 3: Scholar   │ ← Subject matter expert
    │  (auto)  │  │ Review            │
    └──────────┘  └──────────┬────────┘
                       PASS │
                            ▼
                       ┌──────────┐
                       │  Publish  │
                       └──────────┘
```

### 5.2 Community Features

| Feature | Description | Priority |
|---|---|---|
| Contribution Dashboard | See your submissions, status, history | High |
| Leaderboard | Top contributors (by verified count, quality score) | Medium |
| Badge System | "Scriber", "Scholar", "Editor" roles based on contributions | Low |
| Submission API | Upload text, PDF, image, YouTube URL | Immediate |
| Edit Suggestions | Community can suggest corrections to published content | High |
| Translation Crowdsource | Users can submit English/hindi translations | Low |
| Attribution Page | Per-user contribution credit/profile | Medium |

### 5.3 Contributor Verification

```typescript
interface ContributorProfile {
  userId: string;
  displayName: string;
  joinedAt: Date;

  // Quality metrics
  totalSubmissions: number;
  verifiedSubmissions: number;
  rejectionRate: number;          // % rejected by moderation
  avgQualityScore: number;        // 0–100 AI-assessed quality

  // Roles (earned through contributions)
  role: 'CONTRIBUTOR' | 'PEER_REVIEWER' | 'SCHOLAR' | 'EDITOR';
  roleAssignedAt: Date;

  // Reputation
  trustLevel: 'NEW' | 'ESTABLISHED' | 'TRUSTED' | 'CURATOR';
  trustScore: number;             // 0.0–1.0
}
```

---

## 6. Source Trust Scoring

### 6.1 Score Components

```typescript
interface TrustScoreComponents {
  // Historical quality (40%)
  moderationPassRate: number;     // % of items passing Tier 1 AI review
  verifiedRatio: number;          // % published after full moderation
  correctionRate: number;         // % needing post-publication correction (inverse)

  // Technical reliability (25%)
  uptime: number;                  // % successful fetches (7d window)
  responseTimeScore: number;       // Normalized inverse of avg response time
  formatConsistency: number;       // % of items with valid structure

  // Source legitimacy (20%)
  licenseClarity: number;         // Has clear license/terms?
  attributionQuality: number;     // Provides proper attribution?
  domainAge: number;              // Older = more established
  hasRobotsTxt: boolean;          // Respects robot exclusion standard

  // Community signal (15%)
  communityReports: number;       // Inverse of user flags/reports
  editorFeedback: number;         // Editor assessments
  crossSourceMatchRate: number;   // % overlaps with other trusted sources
}
```

### 6.2 Scoring Algorithm

```typescript
function calculateTrustScore(components: TrustScoreComponents): number {
  const scores = [
    components.moderationPassRate * 0.20,
    components.verifiedRatio * 0.20,
    (1 - components.correctionRate) * 0.10,  // Inverse
    components.uptime * 0.15,
    components.responseTimeScore * 0.10,
    components.formatConsistency * 0.10,
    components.licenseClarity * 0.08,
    components.attributionQuality * 0.07,
    Math.min(components.domainAge / 10, 1) * 0.05,  // Cap at 10 years
    (1 - components.communityReports) * 0.08,
    components.editorFeedback * 0.05,
    components.crossSourceMatchRate * 0.02,
  ];

  return scores.reduce((a, b) => a + b, 0);
}
```

### 6.3 Trust Score Tiers

| Score Range | Tier | Behavior |
|---|---|---|
| 0.90–1.00 | **Trusted** | Auto-approve after AI check. Skip peer review. |
| 0.70–0.89 | **Established** | Standard pipeline (AI → Peer review). Fast-track if AI score > 0.95. |
| 0.40–0.69 | **New** | Full pipeline (AI → Peer → Scholar). Manual review required. |
| 0.00–0.39 | **Untrusted** | Manual review only. May require content spot-check. |
| — | **Blocked** | Disabled. Requires admin intervention. |

---

## 7. Content Growth Strategy

### 7.1 Phased Targets

```
Phase 0 (Current):    360 compositions
Phase 1 (Month 1):   10,000  →  28× growth
Phase 2 (Month 2-3): 100,000 →  10× growth
Phase 3 (Month 4-6): 1,000,000+ →  10× growth
```

### 7.2 Phase 1: 360 → 10K (Month 1)

**Strategy**: Maximize existing scraper output + manual curation

| Tactic | Est. Yield | Effort | Dependencies |
|---|---|---|---|
| Run all 26 existing scrapers at scale | 3,000–5,000 | Low | Scraper maintenance |
| Wikisource-mr bulk import | 1,000–2,000 | Medium | Wikisource scraper |
| Santeknath full archive | 500–1,000 | Low | Existing scraper |
| OCR digitization of public-domain books | 500–1,000 | Medium | Book scanning |
| Community submission campaign | 500 | Medium | Contribution portal |
| Stotra Nidhi import | 300–500 | Low | Existing scraper |
| YouTube → text (transcribed aartis) | 200–500 | Medium | YouTube scraper |
| **Phase 1 total** | **6,000–10,500** | | |

### 7.3 Phase 2: 10K → 100K (Month 2-3)

**Strategy**: Automated discovery + community scaling

| Tactic | Est. Yield | Effort | Dependencies |
|---|---|---|---|
| Sitemap discovery + scrape (20+ new sites) | 15,000–30,000 | Medium | Discovery engine |
| Crawl cultural archives (ASI, gov archives) | 10,000–20,000 | High | Custom crawler |
| Wikisource expanded (all Marathi texts) | 5,000–10,000 | Medium | Wikisource expand |
| Community submissions scale | 3,000–5,000 | Medium | Incentive program |
| Marathi Wikipedia devotional content | 2,000–5,000 | Low | Wikipedia scraper |
| YouTube playlist batch import | 2,000–5,000 | Medium | Transcript pipeline |
| Cross-reference via knowledge graph gaps | 3,000–5,000 | High | Graph gap analysis |
| User-generated content (write/type) | 1,000–3,000 | Low | Text input UI |
| **Phase 2 total** | **41,000–83,000** | | |

### 7.4 Phase 3: 100K → 1M+ (Month 4-6)

**Strategy**: Hyper-scale through algorithmic discovery + partnerships

| Tactic | Est. Yield | Effort | Dependencies |
|---|---|---|---|
| Automated DLP crawler (discover → scrape → canonical) | 300,000–500,000 | High | Mature discovery engine |
| Partnership with cultural institutions | 100,000–200,000 | High | Legal agreements |
| Bulk OCR of scanned libraries | 50,000–100,000 | High | OCR infra scaling |
| Multilingual expansion (Hindi, Kannada, Telugu) | 50,000–100,000 | High | Translation pipeline |
| Community at scale (10K+ users) | 50,000–100,000 | Medium | Community features |
| UGC + AI-assisted correction loops | 30,000–50,000 | Medium | Feedback infra |
| **Phase 3 total** | **580,000–1,050,000** | | |

### 7.5 Growth Rate Management

```
Scaling factors to avoid quality collapse:

   100%
     │ ●──●──●──●──●──●──●
  Q  │    ●     ●     ●
  U  │     ●   ●   ●   ●
  A  │      ● ●     ● ●
  L  │       ●       ●
  I  │
  T  └─────────────────────────
  Y        360 → 10K → 100K → 1M+

- Each phase: add 75% new content, but also re-process existing with better AI
- Quality gate before growth phase transitions
- Trust scores must be ≥ 0.70 for 50%+ of new sources before expanding
```

---

## 8. Moderation Workflow

### 8.1 Existing Enhancement

The current 3-tier system (AI → Peer → Scholar) is solid. Enhancements:

| Enhancement | Description | Phase |
|---|---|---|
| **Auto-escalation rules** | If AI confidence < 0.6 → skip Tier 2, go directly to Scholar | 1 |
| **Batch moderation UI** | Moderators can approve/reject 50 items at once | 1 |
| **Quality scoring per item** | AI assigns quality score (0–100) to every submission | 1 |
| **Learning from corrections** | When editor overrides AI, log the correction → improve AI prompts | 2 |
| **Sampling audit** | Randomly audit 5% of AI-approved items for quality assurance | 2 |
| **Conflict resolution** | When Tier 2 vote is split (50/50), auto-escalate to Tier 3 | 2 |
| **Streaming moderation** | WebSocket for live moderation queue updates | 3 |

### 8.2 Moderation Queue Priority

```typescript
function calculatePriority(item: ModerationItem): number {
  // Higher number = process first
  let priority = 0;

  // Source trust score (higher trust = lower priority for review = fast-track)
  if (item.sourceTrustScore >= 0.90) priority += 100;
  else if (item.sourceTrustScore >= 0.70) priority += 50;

  // Community contributions always reviewed faster
  if (item.submissionType === 'community') priority += 30;
  if (item.contributorTrustLevel === 'TRUSTED') priority += 20;

  // AI confidence (higher confidence = lower priority since less risky)
  if (item.aiConfidence >= 0.95) priority += 40;
  else if (item.aiConfidence >= 0.80) priority += 20;

  // Time in queue (aging factor)
  const hoursWaiting = (Date.now() - item.createdAt.getTime()) / 36e5;
  priority += Math.floor(hoursWaiting / 24) * 10; // +10 per day

  return priority;
}
```

### 8.3 Moderation Workflow State Machine

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
                    AI Review (Tier 1)
                   ┌─────┴─────┐
                   │           │
               PASS[0.95+]   FAIL / LOW CONFIDENCE
                   │               │
                   ▼               ▼
            ┌────────────┐  ┌──────────────┐
            │ PUBLISHED  │  │ PEER REVIEW  │
            │ (auto)     │  │ (Tier 2)     │
            └────────────┘  └──────┬───────┘
                                   │
                          ┌────────┼────────┐
                          │        │        │
                      APPROVED  SPLIT   REJECTED
                          │        │        │
                          ▼        ▼        ▼
                   ┌─────────┐ ┌────────┐ ┌────────┐
                   │PUBLISHED│ │SCHOLAR │ │REJECTED│
                   └─────────┘ │(Tier 3)│ └────────┘
                               └───┬────┘
                                   │
                           ┌───────┴───────┐
                           │               │
                       APPROVED        REJECTED
                           │               │
                           ▼               ▼
                     ┌──────────┐    ┌──────────┐
                     │PUBLISHED │    │ REJECTED │
                     └──────────┘    └──────────┘
```

---

## 9. Knowledge Graph Updates

### 9.1 Auto-Build on Content Arrival

When new content enters the system, auto-create graph edges:

```typescript
async function buildGraphForComposition(compositionId: string): Promise<void> {
  const comp = await db.composition.findUnique({
    where: { id: compositionId },
    include: { saint: true, deity: true, festivals: true, categories: true },
  });
  if (!comp) return;

  const edges = [];

  // Author → Composition
  if (comp.saintId) {
    edges.push({
      sourceType: 'SAINT', sourceId: comp.saintId,
      targetType: 'COMPOSITION', targetId: comp.id,
      relationship: 'COMPOSED',
    });
  }

  // Composition → Deity
  if (comp.deityId) {
    edges.push({
      sourceType: 'COMPOSITION', sourceId: comp.id,
      targetType: 'DEITY', targetId: comp.deityId,
      relationship: 'DEDICATED_TO',
    });
  }

  // Composition → Festival
  for (const festival of comp.festivals) {
    edges.push({
      sourceType: 'COMPOSITION', sourceId: comp.id,
      targetType: 'FESTIVAL', targetId: festival.id,
      relationship: 'RECITED_AT',
    });
  }

  // Composition → Category
  for (const category of comp.categories) {
    edges.push({
      sourceType: 'COMPOSITION', sourceId: comp.id,
      targetType: 'CATEGORY', targetId: category.id,
      relationship: 'BELONGS_TO',
    });
  }

  // Batch create all edges
  await Promise.all(edges.map(e => relationshipEngine.createEdge(
    e.sourceType, e.sourceId, e.targetType, e.targetId, e.relationship
  )));
}
```

### 9.2 Periodic Graph Maintenance

```typescript
// Run weekly: Rebuild edges for compositions that may have been missed
// 1. Find compositions with no outgoing edges
// 2. Find orphaned edges (pointing to deleted entities)
// 3. Detect new relationship patterns based on AI enrichment
// 4. Run community detection to discover new clusters
// 5. Recommend new categories/festivals based on graph structure
```

### 9.3 Graph-Enabled Discovery

```typescript
// Use knowledge graph to FIND new content sources:
// "What festivals are under-represented in our collection?"
// → Query graph for festivals with few COMPOSITION edges
// → Prioritize scraping content for those festivals

// "Which saints have gaps in their oeuvre?"
// → Compare known compositions per saint vs expected based on hagiography
// → Target scraping to fill gaps

// "Where are the dense clusters suggesting a missing source?"
// → If 100 compositions reference the same deity but only 50 are in our corpus
// → Search for the deity name + "abhang" in discovery crawls
```

---

## 10. Dashboard & Admin Controls

### 10.1 Growth Dashboard (Admin UI)

```
┌─────────────────────────────────────────────────────────────┐
│  📊 GROWTH DASHBOARD                    [Last updated: now] │
├─────────────────────────────────────────────────────────────┤
│  Total: 360   New today: 12   Pending review: 47           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Growth chart (last 30 days)               [line graph] ││
│  │  ▁▂▃▅▇███████████████████████████████████               ││
│  │  360 ──────────────────────────────────→ 10,000 target  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────┬──────────┬──────────┬──────────────────────┐│
│  │ Source     │ Compositions │ Status  │ Health             ││
│  ├────────────┼──────────┼──────────┼──────────────────────┤│
│  │ abhang.in  │    2,340 │ ACTIVE   │ 🟢 98% pass rate    ││
│  │ tukaram    │    1,200 │ ACTIVE   │ 🟡 82% pass rate    ││
│  │ wikisource │      890 │ ACTIVE   │ 🟢 95% pass rate    ││
│  │ community  │      134 │ ACTIVE   │ 🟢 99% pass rate    ││
│  │ new-site-X │        0 │ PENDING  │ ⚪ Awaiting review   ││
│  └────────────┴──────────┴──────────┴──────────────────────┘│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ⚡ Quick Actions                                     │   │
│  │  [Run Discovery Cycle] [Review Queue] [Add Source]   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Dashboard API Endpoints

```typescript
// GET /api/admin/discovery/stats
//   → { totalSources, activeSources, totalCompositions,
//       compositionsToday, pendingReview, lastCycleAt, nextCycleAt }

// GET /api/admin/discovery/sources
//   → ContentSource[] with health metrics

// GET /api/admin/discovery/sources/:id
//   → Single source with full metrics + error history

// POST /api/admin/discovery/sources
//   → Create new source

// PUT /api/admin/discovery/sources/:id
//   → Update source config

// POST /api/admin/discovery/sources/:id/test
//   → Test scrape a single page from this source

// POST /api/admin/discovery/run
//   → Trigger immediate discovery cycle

// GET /api/admin/discovery/history?limit=20
//   → Recent discovery run reports

// GET /api/admin/discovery/alerts
//   → Active alerts (failing sources, low trust scores, etc.)
```

### 10.3 Source Management UI

The admin panel (`app/admin/`) already exists with a pricing page. Add:

- **`app/admin/discovery/`** — Growth dashboard
- **`app/admin/discovery/sources/`** — Source list + CRUD
- **`app/admin/discovery/sources/[id]/`** — Source detail + health metrics
- **`app/admin/discovery/history/`** — Discovery run logs
- **`app/admin/discovery/alerts/`** — Active alerts management

---

## 11. Implementation Roadmap

### Phase 0: Foundation (Week 1-2)

| # | Deliverable | File(s) | Est. Effort |
|---|---|---|---|
| 1 | Source Registry model + Prisma schema | `prisma/schema.prisma` (add models), `src/discovery/source-registry.ts` | 2 days |
| 2 | Source trust scoring engine | `src/discovery/trust-scorer.ts` | 1 day |
| 3 | Basic discovery worker (single source) | `src/discovery/discovery-worker.ts` | 2 days |
| 4 | Health check + auto-disable | `src/discovery/scraper-monitor.ts` | 1 day |
| 5 | Seed known sources from existing scrapers | `src/discovery/seed-sources.ts` | 1 day |

### Phase 1: Core Pipeline (Week 3-4)

| # | Deliverable | File(s) | Est. Effort |
|---|---|---|---|
| 6 | Full discovery cycle orchestrator | `src/discovery/scheduler.ts` | 2 days |
| 7 | Graph auto-build on new content | `src/discovery/graph-builder.ts` | 1 day |
| 8 | Community tip submission API | `app/api/acquire/discovery/community/route.ts` | 1 day |
| 9 | Discovery history models + logging | `src/discovery/discovery-history.ts` | 1 day |
| 10 | Existing scraper registration in registry | `src/discovery/register-scrapers.ts` | 2 days |

### Phase 2: Growth Acceleration (Month 2)

| # | Deliverable | File(s) | Est. Effort |
|---|---|---|---|
| 11 | Growth dashboard API endpoints | `app/api/admin/discovery/*` | 2 days |
| 12 | Admin UI pages | `app/admin/discovery/*` | 3 days |
| 13 | Enhanced moderation UI (batch) | `app/admin/moderation/*` | 2 days |
| 14 | Alert system (email/webhook) | `src/discovery/alerter.ts` | 1 day |
| 15 | RSS/sitemap auto-discovery | `src/discovery/source-discoverer.ts` | 2 days |

### Phase 3: Hyper-Scale (Month 3-6)

| # | Deliverable | File(s) | Est. Effort |
|---|---|---|---|
| 16 | Distributed scraper workers | `src/discovery/workers/*` | 5 days |
| 17 | Community leaderboard + badges | `app/api/community/*` + `app/community/*` | 3 days |
| 18 | Translation pipeline | `src/translation/*` | 5 days |
| 19 | Partnership ingestion API | `app/api/acquire/partnership/route.ts` | 2 days |
| 20 | Knowledge graph gap analysis | `src/discovery/gap-analyzer.ts` | 2 days |

---

## 12. Data Flow Diagram

```
External Sources                    Vitthalaya Platform
═══════════════                    ════════════════════

┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Sitemap      │────▶│                  │     │              │
│ RSS/Atom     │────▶│  Discovery       │────▶│  Source       │
│ Websites     │────▶│  Orchestrator    │     │  Registry     │
│ YouTube      │────▶│                  │     │  (Postgres)   │
│ Community    │────▶│  (worker.ts)     │     │              │
│ Upload       │────▶│                  │     └──────┬───────┘
└─────────────┘     └────────┬─────────┘            │
                             │                      │
                             ▼                      │
                    ┌──────────────────┐            │
                    │  Scraper Engine   │            │
                    │  (rate limited)   │            │
                    └────────┬─────────┘            │
                             │                      │
                             ▼                      │
                    ┌──────────────────┐            │
                    │  Canonical        │            │
                    │  Engine (dedup)   │            │
                    └────────┬─────────┘            │
                             │                      │
                             ▼                      │
                    ┌──────────────────┐            │
                    │  Composition      │            │
                    │  (unreviewed)     │            │
                    └────────┬─────────┘            │
                             │                      │
                             ▼                      │
                    ┌──────────────────┐            │
              ┌────▶│  AI Enrichment    │            │
              │     │  + Graph Edges    │            │
              │     └────────┬─────────┘            │
              │              │                      │
              │              ▼                      │
              │     ┌──────────────────┐            │
              │     │  Moderation       │            │
              │     │  (3-tier system)  │            │
              │     └────────┬─────────┘            │
              │              │                      │
              │        PASS  │  REJECT              │
              │         ┌────┴────┐                 │
              │         ▼         ▼                 │
              │  ┌──────────┐ ┌──────────┐          │
              │  │ Published │ │ Rejected │          │
              │  │ (reviewed)│ │ (logged)  │          │
              │  └──────────┘ └──────────┘          │
              │         │                           │
              │         ▼                           │
              │  ┌──────────┐                       │
              └──│ Meil      │                       │
                 │ Search    │                       │
                 │ Index     │                       │
                 └──────────┘                       │
                                                    │
                 ┌──────────────────────────────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  Knowledge Graph  │
        │  (EntityGraphEdge)│
        │  + Gap Analysis   │
        └──────────────────┘
```

---

## 13. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Content quality collapse at scale | Medium | High | Progressive trust scoring, sampling audits, fallback thresholds |
| Source goes offline/blocks us | Medium | Medium | Auto-detect, degrade gracefully, diversify sources |
| Duplicate content explosion | High | Medium | Canonical engine with improved fuzzy matching |
| Copyright/compliance issues | Low | High | License scanning, robots.txt compliance, attribution, takedown API |
| Community spam/abuse | Medium | Medium | Tier 1 AI filter, account trust levels, rate limits |
| Search engine penalties for scraping | Low | Medium | Rate limiting, respect robots.txt, no duplicate content penalties |
| Moderation bottleneck | High | Medium | Auto-approve for high-trust sources, batch review UI, gamify moderation |
| AI enrichment costs at scale | Medium | Medium | Free provider pool, caching, batch processing, quality tiers |

---

## Project Structure

```
src/discovery/
├── ARCHITECTURE.md          # This document
├── source-registry.ts       # SourceRegistry class
├── source-registry.test.ts  # Tests
├── discovery-worker.ts      # Per-source discovery worker
├── trust-scorer.ts          # Source trust scoring
├── scraper-monitor.ts       # Health monitoring
├── scheduler.ts             # Daily job scheduler
├── graph-builder.ts         # Auto-build graph edges
├── history.ts               # Discovery run logging
├── alerter.ts               # Alert system
├── source-discoverer.ts     # Find new sources (rss/sitemap)
├── gap-analyzer.ts          # Knowledge graph gap analysis
├── types.ts                 # Shared types
└── index.ts                 # Public API

app/api/admin/discovery/
├── stats/route.ts           # GET /api/admin/discovery/stats
├── sources/route.ts         # GET/POST /api/admin/discovery/sources
├── sources/[id]/route.ts    # GET/PUT /api/admin/discovery/sources/:id
├── sources/[id]/test/route.ts # POST test scrape
├── run/route.ts             # POST trigger discovery cycle
├── history/route.ts         # GET discovery run history
└── alerts/route.ts          # GET active alerts

app/admin/discovery/
├── page.tsx                 # Growth dashboard main page
├── sources/page.tsx         # Source list + CRUD
├── sources/[id]/page.tsx    # Source detail + metrics
├── history/page.tsx         # Discovery run logs
└── alerts/page.tsx          # Alert management
```

---

## Quick Start

```bash
# 1. Run Prisma migration (after adding source registry models)
bun run db:migrate

# 2. Seed known sources from existing scrapers
bun run src/discovery/seed-sources.ts

# 3. Run a manual discovery cycle
bun run src/discovery/scheduler.ts --run-once

# 4. Start the scheduler (for production)
bun run src/discovery/scheduler.ts --daemon

# 5. Visit the admin dashboard
open http://localhost:3000/admin/discovery
```
