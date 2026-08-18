-- Migration: Add wari_stops table (Wari pilgrimage route)
--
-- Drives the /wari page with documented, real places and route distances
-- instead of hardcoded arrays. Idempotent (IF NOT EXISTS + inline FKs):
-- safe to apply against an existing database and provisions a fresh clone
-- in one pass.

CREATE TABLE IF NOT EXISTS "wari_stops" (
    "id" TEXT NOT NULL,
    "name_marathi" TEXT NOT NULL,
    "name_transliteration" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wari_stops_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wari_stops_slug_key" ON "wari_stops"("slug");
CREATE INDEX IF NOT EXISTS "wari_stops_sort_order_idx" ON "wari_stops"("sort_order");
