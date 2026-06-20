# PLANNER: Scraper Expansion — Implementation Steps

## Overview
Add 3 new website scrapers + 1 YouTube scraper + register all in CLI.

## Steps (ordered, sequential)

### Step 1: New Source Scraper — Stotra Nidhi
- File: `src/scraper/stotra-nidhi.ts`
- Source: https://stotranidhi.com/ — Marathi stotra and aarti
- Implements `BaseScraper` like `abhang-in.ts`
- Extracts stotra/aarti text from structured pages
- **Verify**: can be imported and instantiated

### Step 2: New Source Scraper — Marathi Aarti
- File: `src/scraper/marathi-aarti.ts`
- Source: https://marathiaarti.com/ — Collection of aartis
- Implements `BaseScraper`
- Extracts aarti text, deity, occasion
- **Verify**: can be imported and instantiated

### Step 3: New Source Scraper — Marathi Source
- File: `src/scraper/marathi-source.ts`
- Source: https://www.marathisource.com/ — Abhang, Bhajan, Stotra
- Implements `BaseScraper`
- **Verify**: can be imported and instantiated

### Step 4: YouTube Scraper
- File: `src/scraper/youtube-scraper.ts`
- Source: YouTube — extracts from video descriptions, captions, playlists
- Implements `BaseScraper`
- Uses puppeteer-core to navigate YouTube
- Handles: expand description, click "show transcript", extract lines
- **Verify**: can be imported and instantiated

### Step 5: Register All New Scrapers in CLI
- File: `src/cli/scrape.ts`
- Add new sources to `SOURCES` array
- Add `createScraper` cases for each new scraper
- Update help text

### Step 6: Verify Lint & Typecheck
- Run `bun run typecheck`
- Run `bun run lint`
- Fix any issues