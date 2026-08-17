# Adding Compositions & Growing the Catalog to 10,000 Real Compositions

How to add lyrics to Vitthalaya, how to clean the noisy imports already in the
database, and the strategy to grow from ~321 reviewed compositions to a
10,000-composition collection of **real, rights-cleared** devotional texts.

---

## 1. Three ways to add compositions

### A. Admin API (one composition at a time)

```bash
curl -X POST http://localhost:3000/api/admin/compositions \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin session cookie>" \
  -d '{
    "titleMarathi": "ज्ञानदेवा तुझ्या नामाची",
    "titleTranslit": "Dnyandev Tuzya Namachi",
    "type": "abhang",
    "fullText": "ज्ञानदेवा तुझ्या नामाची\nजोडी चाले सदा गर्जना",
    "saintId": null,
    "source": "Marathi Wikisource — Tukaram Gatha"
  }'
```

- Lyrics are **cleaned on the way in** (YouTube/import metadata stripped).
- **Dedup by content hash** — identical lyrics return `409` with the existing
  id instead of creating a silent duplicate.
- Every addition is written to the **audit log**.
- There is no add-composition admin UI yet — the API is the contract; a form
  can be wired to it later.

### B. Bulk import (a curated JSON bundle)

```bash
bun run scripts/import-compositions.ts path/to/compositions.json
bun run scripts/import-compositions.ts path/to/compositions.json --draft  # → review queue
```

JSON shape (array of objects):

```json
[
  {
    "titleMarathi": "...",
    "titleTranslit": "...",
    "type": "abhang",
    "fullText": "lyrics…",
    "saintName": "तुकाराम महाराज",
    "source": "Marathi Wikisource — Tukaram Gatha"
  }
]
```

- Dedup by content hash (idempotent — re-running the same file is a no-op).
- Saints resolve by name (Marathi first, then transliteration); unknown saints
  are reported and left unattributed rather than guessed.
- `--draft` inserts `reviewed=false` rows for the moderation queue instead of
  publishing directly.

### C. Acquisition pipeline (scaled, scheduled)

The project already has a full crawl → extract → segment → quality-score →
persist pipeline under `src/crawl4ai/`:

```bash
bun run acquire:wikisource    # scripts/acquire-wikisource.ts — Marathi Wikisource categories
bun run acquire:archive       # scripts/acquire-internet-archive.ts — public-domain books
bun run acquire:all           # src/cli/acquire-all.ts
bun run acquire:continuous    # src/cli/acquire-continuous.ts — scheduled sweep
```

The Wikisource script already targets आरती, तुकाराम गाथा, हरिपाठ,
ज्ञानेश्वरी, भजन and more. `acquire:continuous` is the daily-discovery engine
the audio-platform plan (T5) calls for.

---

## 2. Denoise the existing data

Many of the current 321 compositions were imported from YouTube descriptions:
the "lyrics" field contains timestamps, ►/▶ markers, URLs, hashtags,
"Singer -"/"Label -" credit lines, and English-only description text. A scan
finds **89 of 321** with clear noise signals and **106** with fewer than 4
Devanagari lines (likely not real lyrics at all).

The cleaner is pure and tested (`src/lib/lyrics-clean.ts`): it drops only lines
with hard noise signals, never rewrites a Devanagari line, and keeps stanza
separators (`॥`). Run it:

```bash
bun run lyrics:denoise                      # dry run — report only
bun run lyrics:denoise --apply              # persist: writes a CompositionVersion + cleaned fullText
bun run lyrics:denoise --type=abhang --apply
```

`--apply` is safe and auditable:

- The **original text is preserved** as a new `CompositionVersion`
  (`changeReason: "Denoise: removed N YouTube/import metadata line(s)"`).
- The composition's `fullText` is updated to the cleaned text.
- The report lists every composition still flagged as `fragment` (< 4
  Devanagari lines) — those are candidates for **re-acquisition from a proper
  source**, not for guessing.

Rules of thumb for the report:

- `lyrics` → done.
- `noisy` → cleaned lyrics exist; verify the result reads correctly.
- `fragment` → the row is mostly description text; find the real source
  (Wikisource / archive.org) and re-import, or leave it unpublished.

---

## 3. Strategy: 10,000 real compositions

**Reality check:** 10,000 compositions cannot be conjured — they have to be
sourced and verified. The machinery for that already exists; the plan below
turns it into a program. Only **public-domain** text is used (pre-1900 Marathi
bhakti literature is overwhelmingly public domain; verified per source).

### Phase 1 — Mine the structured public sources (321 → ~2,500)

| Source | What it provides | Tool |
|---|---|---|
| Marathi Wikisource | Aartis, Tukaram Gatha, Haripath, Dnyaneshwari, abhang collections — hundreds of clean pages | `acquire:wikisource` |
| Archive.org | Public-domain Marathi bhakti books (full-text OCR) | `acquire:archive` |
| Existing catalog dedup | content-hash dedup so the same abhang from two sources lands once | importer + canonical engine |

Run `acquire:wikisource` (and `acquire:archive`) on a schedule, route results
through the existing moderation/review queue, and publish only approved rows.

### Phase 2 — Expand by corpus, not by scraping harder (→ ~5,000)

- **Saint gathas:** Tukaram Gatha (~4,000 abhangs), Namdev, Eknath,
  Dnyaneshwar, Janabai — the single largest real source of unique
  compositions.
- **Devotional types:** expand beyond the current 9 types with structured
  category pages (गौळणी, कीर्तन, पोवाडे, स्तोत्रे).
- **Metadata enrichment:** run `bun run enrich` / `bun run canonical` over new
  rows to attach saints, deities, festivals, and canonical ids — which also
  feeds the composition-matcher from the audio platform.

### Phase 3 — Long tail + continuous discovery (→ 10,000)

- **Gutenberg & university collections** (public-domain Marathi literature),
  temple publications that grant permission, and community-digitized
  manuscripts that clear rights.
- **`acquire:continuous`** as the daily discovery engine: new sources,
  dedup, quality scoring, review queue, publish — exactly the T5 spec.
- **Quality gates at every step:** `QualityScorer` in the crawl pipeline,
  `cleanLyrics` on every import, the moderation room for human verification,
  and the canonical engine so 10,000 rows stay one-canonical-per-composition.

### Guardrails (non-negotiable)

- Public-domain or permission-cleared text only — never scrape behind
  paywalls/CAPTCHAs, and honor `robots.txt` (the pipeline enforces this).
- Nothing publishes without passing review; noisy imports go to re-acquisition,
  never to guessing.
- Every edit is versioned (`CompositionVersion`) and audited — 10k rows with
  provenance, not 10k rows of junk.

**Where to start today:** run `bun run lyrics:denoise --apply`, then
`bun run acquire:wikisource --limit=50` and review what lands in the queue.
