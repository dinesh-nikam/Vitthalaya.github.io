-- Migration: Add audio platform models (T2/T3/T4/T6)
-- audio_processing_jobs, rights_records, composition_matches
--
-- Replaces the ad-hoc `prisma db push` step that previously created these
-- tables. Idempotent (IF NOT EXISTS + inline FKs): safe to apply against an
-- existing database that already has the tables, and provisions a fresh
-- clone in one pass.
--
-- Prerequisite: parent tables (uploaded_files, users, compositions) must
-- exist first — provision them via `prisma db push` (the project's build
-- flow) or the schema's other migrations before applying this file.
--
-- Generated from `prisma migrate diff --from-empty --to-schema-datamodel`
-- against prisma/schema.prisma (PostgreSQL flavor), matching the existing
-- convention of flat timestamped SQL files in prisma/migrations/.

CREATE TABLE IF NOT EXISTS "audio_processing_jobs" (
    "id" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "video_id" TEXT,
    "url" TEXT,
    "storage_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_processing_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audio_processing_jobs_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploaded_files"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "rights_records" (
    "id" TEXT NOT NULL,
    "uploaded_file_id" TEXT NOT NULL,
    "user_id" TEXT,
    "rights_status" TEXT NOT NULL,
    "consent_granted" BOOLEAN NOT NULL DEFAULT false,
    "publication_permission" BOOLEAN NOT NULL DEFAULT false,
    "attribution" TEXT,
    "source" TEXT DEFAULT 'record',
    "license" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rights_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "rights_records_uploaded_file_id_fkey" FOREIGN KEY ("uploaded_file_id") REFERENCES "uploaded_files"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rights_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "composition_matches" (
    "id" TEXT NOT NULL,
    "uploaded_file_id" TEXT NOT NULL,
    "composition_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "user_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "matched_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "composition_matches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "composition_matches_uploaded_file_id_fkey" FOREIGN KEY ("uploaded_file_id") REFERENCES "uploaded_files"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "composition_matches_composition_id_fkey" FOREIGN KEY ("composition_id") REFERENCES "compositions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "audio_processing_jobs_upload_id_idx" ON "audio_processing_jobs"("upload_id");
CREATE INDEX IF NOT EXISTS "audio_processing_jobs_status_idx" ON "audio_processing_jobs"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "rights_records_uploaded_file_id_key" ON "rights_records"("uploaded_file_id");
CREATE INDEX IF NOT EXISTS "rights_records_user_id_idx" ON "rights_records"("user_id");
CREATE INDEX IF NOT EXISTS "composition_matches_uploaded_file_id_idx" ON "composition_matches"("uploaded_file_id");
CREATE INDEX IF NOT EXISTS "composition_matches_composition_id_idx" ON "composition_matches"("composition_id");
CREATE INDEX IF NOT EXISTS "composition_matches_status_idx" ON "composition_matches"("status");
