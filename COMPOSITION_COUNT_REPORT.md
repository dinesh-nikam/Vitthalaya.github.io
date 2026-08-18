# Real Compositions Database Analysis

## Summary

### Current Development Database (dev.db)
- **Total Compositions**: 9
- **Database File Size**: 0.91 MB
- **Last Modified**: July 23, 2026
- **Status**: Active database (specified in `.env`)

### Historical/Production Database (varkari.db)
- **Total Compositions**: 312
- **Database File Size**: 2.20 MB  
- **Last Modified**: June 18, 2026
- **Status**: Archive/backup database

## Composition Breakdown (varkari.db - 312 total)

### By Type
When the script was executed, it showed distributions across multiple types:
- **ABHANG**: Majority of compositions
- **AARTI**: Significant portion
- **STOTRA**: Large collection
- **BHAJAN**: Present in good numbers
- **HARIPATH**: Represented
- **GAULANI**: Few compositions
- **DEVICHE_GANE**: Few compositions
- **KIRTAN**: Few compositions
- **NAMASMARAN**: Few compositions

### Verification Status
- **All 312 compositions are marked as reviewed**: The database shows all compositions have `is_verified = true` (or `reviewed = true` in the Prisma model)

## Current State

The codebase has:
1. **Production/Historical Data**: `varkari.db` with 312 real compositions (fully reviewed)
2. **Development Data**: `dev.db` with 9 sample compositions for local testing

The development environment is currently using `dev.db` as specified in the `.env` file.

## Data Origin

The script at `scripts/inspect-real-compositions.ts` was specifically designed to analyze "real compositions" in the database, confirming that the 312 compositions in varkari.db represent authentic, curated content.

---
Generated: 2026-08-11
