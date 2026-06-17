# Scraping Policy - Zero Scraping in Phase 0-2

## Policy Statement

**Automated scraping of third-party lyric/devotional websites is NOT part of Phase 0-2.**

All content must be sourced via Editorial Ingestion Pipeline:
1. Manual entry / contributor typing
2. OCR of out-of-copyright book scans
3. Government cultural archive sources  
4. Partner contributions
5. Duplicate check
6. Editor approval → publish

## Files to Remove

The following files exist from a previous implementation and MUST be removed:
- `src/scraper/` - All scraper files
- `src/cli/scrape.ts` - Scraper CLI
- `app/api/scrape/` - Scraping API route
- `.omo/plans/content-scraping-pipeline.md` - Scraping plan

## Verification

Before Phase 0 launch, confirm:
- [ ] No scraping code runs in the stack
- [ ] All content is editorially verified
- [ ] All compositions have `reviewed: true` flag
- [ ] All meanings are original, not copied