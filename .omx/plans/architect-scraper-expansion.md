# ARCHITECT: Scraper Expansion Specification

## What Exists
- **Base class**: `BaseScraper` in `src/scraper/base-scraper.ts` — abstract class with browser launch, rate limiting, logging, dedup, JSON output
- **3 scrapers**: `abhang-in.ts`, `tukaram-gatha.ts`, `warkari-rojnishi.ts`
- **CLI**: `src/cli/scrape.ts` — parses args, runs scrapers, saves JSON, inserts to SQLite DB
- **Types**: `ScrapedComposition`, `ScrapeResult`, `ScraperConfig`, `CLIOptions` in `types.ts`
- **Infrastructure**: `RateLimiter`, `Logger`, `DedupEngine` in `src/scraper/`

## What Needs to Be Built

### 1. More Online Site Scrapers
New scrapers following the existing `BaseScraper` pattern:

| Source | Content | URL Pattern |
|--------|---------|-------------|
| marathisource.com | Abhang, Bhajan, Aarti | https://www.marathisource.com/ |
| bhaktisangeet.com | Bhajan, Aarti | https://bhaktisangeet.com/ |
| marathiaarti.com | Aarti | https://marathiaarti.com/ |
| divyamarathi.com | Devotional content | https://divyamarathi.com/ |
| maharashtratimes.com (dharma section) | Devotional | https://maharashtratimes.com/ |
| stotranidhi.com | Stotra | https://stotranidhi.com/ |

**Priority**: start with 3-4 new sources that are most content-rich and allow access.

### 2. YouTube Scraper
A new scraper type that extracts Marathi devotional content from YouTube:
- **Video descriptions**: often contain full abhang/bhajan text
- **Comments**: sometimes contain verses
- **Captions/subtitles**: auto-generated or manually uploaded Marathi captions
- **Playlist aggregation**: scrape playlists of bhajan/abhang channels

**Approach**: Use `puppeteer-core` to:
1. Go to YouTube video/playlist pages
2. Expand video description (click "more")
3. Extract text from description, captions button, comments
4. Map to `ScrapedComposition` type

### 3. YouTube via Transcript API (Alternative)
If puppeteer is too heavy, use `youtube-transcript` npm package or the Innertube API to fetch captions directly.

### Interfaces

```typescript
// New types to add to types.ts
export interface YouTubeSourceConfig {
  videoIds?: string[];
  playlistUrl?: string;
  channelUrl?: string;
  maxVideos: number;
  extractDescription: boolean;
  extractCaptions: boolean;
  extractComments: boolean;
  language: string; // e.g. 'mr' for Marathi
}
```

### Constraints
- All new scrapers must extend `BaseScraper`
- Rate limiting: 2-4s delay with jitter
- Respect robots.txt (check per source)
- Deduplication via `DedupEngine`
- Output same JSON format as existing scrapers
- Register all new scrapers in `src/cli/scrape.ts` CLI
- Update `SOURCES` array in CLI