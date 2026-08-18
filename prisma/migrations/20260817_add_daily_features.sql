-- Daily devotional rotation for the /daily page.
-- Each row references a real composition/saint/festival so the page never
-- fabricates content. Idempotent: safe to run on every db push.
CREATE TABLE IF NOT EXISTS daily_features (
    id              TEXT PRIMARY KEY,
    slot            TEXT NOT NULL,
    rotation_index  INTEGER NOT NULL DEFAULT 0,
    title_marathi   TEXT NOT NULL,
    body_marathi    TEXT,
    composition_id  TEXT REFERENCES compositions(id) ON DELETE SET NULL,
    saint_id        TEXT REFERENCES saints(id) ON DELETE SET NULL,
    festival_id     TEXT REFERENCES festivals(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_features_slot
    ON daily_features (slot, rotation_index);
