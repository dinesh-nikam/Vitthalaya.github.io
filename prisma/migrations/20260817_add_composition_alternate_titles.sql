-- Migration: Add composition alternate titles (canonical Gatha numbers)
-- Stores alternate titles/identifiers for a composition (e.g. the global
-- Eknath Gatha number of a santsahitya-krmank abhang) as a JSON array of
-- strings. Idempotent (IF NOT EXISTS): safe on an existing DB and provisions
-- a fresh clone in one pass.

ALTER TABLE "compositions" ADD COLUMN IF NOT EXISTS "alternate_titles" JSONB;
