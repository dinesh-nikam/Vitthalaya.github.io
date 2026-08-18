# Vitthalaya — Audio → Pure Lyrics Platform: Architecture Audit & Implementation Plan

> **Living docs:** see [audio-platform-architecture.md](./audio-platform-architecture.md)
> (current-state architecture + Mermaid flows) and
> [audio-platform-api.md](./audio-platform-api.md) + [openapi/audio-platform.yaml](./openapi/audio-platform.yaml)
> (REST API reference + OpenAPI 3.0 spec) for what is implemented today.
> This file is the dependency-aware roadmap.

Status: **T1, T2 fully done; T3–T4 queued; T6 audio dashboard done
(analytics/gates remain).** This document is the dependency-aware roadmap.
Nothing below claims "100% accurate transcription" — every stage ships a
measurable confidence + human-review system instead.

---

## 1. Audit of the current architecture

### 1.1 What already exists (reusable)

| Area | Existing module | Reuse for |
|---|---|---|
| Browser recording | `components/audio-recorder.tsx` (MediaRecorder, webm/opus, pause/resume, level meter, preview) | The `/record` UX |
| Upload pipeline | `app/api/acquire/upload/route.ts` → `handleFileUpload` (validate → store → extract → moderation) with `isRecording=true` → sourceType `recording` | Recordings enter moderation as drafts; nothing publishes without admin approval |
| Audio transcription | `src/lib/extractors/audio-extractor.ts` (`transcribeBuffer`, Whisper API/Groq with honest failure) | Base ASR engine (speech-grade; singing-aware is T3) |
| YouTube audio fallback | `src/lib/audio-processing.ts` + `AudioProcessingJob` queue (SKIP LOCKED, retries) + `src/cli/worker-runner.ts` | Pattern for all new background jobs |
| Moderation | `src/lib/moderation-workflow.ts` (`submitToModeration`, `submitPeerVote`, `promoteAndPublish`, tiered review, audit log) | Contributor/moderator workflow for new compositions |
| Marathi normalization | `src/canonical/normalization.ts` (`normalizeForComparison`, `contentHash`, `extractDevanagari`) | Marathi language engine base |
| Dedup / identification | `src/canonical/canonical-engine.ts` (`findBestMatch`, fuzzy+phonetic), `src/canonical/fuzzy-matcher.ts` | Composition matching + duplicate detection |
| AI metadata extraction | `src/ai-enrichment/` (`classifyContent`, `enricher`, queue) | Title/type/saint/deity/festival candidate extraction |
| Search | Meilisearch `src/lib/search-client.ts`, OpenSearch | Approved-composition search (exact/fuzzy/Marathi) |
| Knowledge graph | `src/lib/knowledge-graph-builder.ts`, `buildEdgesForComposition` | Publish-time KG updates |
| Queue infra | `SearchSyncJob`, `AiEnrichmentJob`, `AudioProcessingJob`, `src/lib/workers.ts`, `worker-runner.ts` | All new job types |
| Discovery scaffolding | `ContentSource` (source registry), `DiscoveryJob` (crawler jobs), `src/scraper/`, `src/crawl4ai/` | Daily discovery engine |
| Storage | `src/lib/storage.ts` (local; pluggable provider) | Original + enhanced audio assets |
| Media/SEO/analytics | `Media`, `AnalyticsEvent`, `AuditLog`, `Page` CMS | Analytics + audit trail |
| Player queue | `components/floating-player.tsx` (queue, shuffle, repeat, mini player, lyrics) | Player; persisted playlists are new |

### 1.2 What is missing (new work)

- **Data:** `Playlist`, `PlaylistItem`, `PlaybackHistory`, `AudioFavorite`,
  `RightsRecord`, `TranscriptCorrection`, `CompositionMatch`, `ModelVersion`,
  `EvaluationDataset`, `FAQ` (schema additions, T1).
- **Audio pipeline:** validation → analysis → enhancement (noise reduction,
  vocal isolation, dereverb, loudness, VAD) → transcription. Real denoising /
  vocal isolation need **ffmpeg + a separation model (e.g. demucs)** — not
  present on this host. The pipeline is implemented with real tool calls and
  **honest status** ("enhancement unavailable — no ffmpeg"), never faked (T1
  skeleton, T2 full profiles).
- **Singing-aware ASR:** Whisper is speech-grade. T3 evaluates fine-tuned /
  music-backed models behind `ModelVersion` with offline eval + rollback.
- **Composition identification:** build the matcher over the canonical engine
  + Meilisearch + embeddings; store `CompositionMatch` (T2).
- **Knowledge-assisted correction:** canonical-text-constrained ASR correction
  preserving original ASR + diffs (T2).
- **Personal library / playlists UI:** DB + APIs (T1 foundation), pages (T2).
- **Real-time status:** SSE or polling endpoint (T1 polling), SSE (T3).
- **Admin audio dashboard, FAQ, analytics, daily discovery, load/security
  gates:** T3–T6.

### 1.3 Infrastructure prerequisites (deployment)

- `ffmpeg`/`ffprobe` on the worker host (enhancement, analysis, audio
  fingerprinting).
- Whisper API key (`OPENAI_API_KEY`/`GROQ_API_KEY`) — already supported.
- Optional: vocal-isolation model runtime (demucs) for the "vocal-focused"
  asset; without it the player shows Original + Enhanced only.
- Object storage provider for large assets (`STORAGE_PROVIDER`).

---

## 2. Dependency-aware implementation plan

```
T1  Data foundation + rights + /record + honest status          ← CURRENT
T2  Enhancement pipeline (ffmpeg profiles) + identification + correction
T3  Singing-aware ASR + ModelVersion eval/rollback + SSE status
T4  Personal library, playlists, premium player, synced lyrics
T5  Daily discovery engine + source quality + dedup expansion + FAQ
T6  Admin audio dashboard, analytics, security/load/perf gates, mobile pass
```

### T1 — Data foundation, privacy/rights, record UX (this branch)
- Schema: `Playlist`, `PlaylistItem`, `PlaybackHistory`, `AudioFavorite`,
  `RightsRecord`, `TranscriptCorrection`, `CompositionMatch`, `ModelVersion`,
  `EvaluationDataset`, `FAQ`; back-relations on `User`, `UploadedFile`,
  `Composition`. `UploadedFile` + `UploadedFileVersion` remain the recording /
  audio-asset store (documented mapping: Recording→UploadedFile(format=audio),
  AudioAsset/Version→UploadedFileVersion, AudioProcessingJob already exists).
- `src/lib/rights.ts` — rights determination + `canPublish` gate (pure).
- `/record` page — real recorder, real upload (existing pipeline), real
  processing status via owner-gated status API. No fake progress.
- `src/lib/playlists.ts` — playlist CRUD helpers (ownership-checked) + pure
  reorder/move logic.
- Gates: unit tests, typecheck, lint, `prisma db push` (additive).

### T2 — Audio pipeline + knowledge-assisted transcription
- ✅ `src/audio/` pipeline modules (DONE): `tooling.ts` (ffmpeg/ffprobe/demucs
  capability probe, cached), `profiles.ts` (8 profiles: Clean Voice, Temple,
  Live Bhajan, Kirtan, Group, Wari, Home, Low Quality — highpass, afftdn
  denoise, lowpass/deesser dereverb approach, loudnorm, compressor, limiter),
  `validate-audio.ts` (format/size/duration gates, honest about skipped
  checks), `analyze-audio.ts` (ffprobe JSON + volumedetect, pure parsers),
  `enhance-audio.ts` (16 kHz mono WAV out, never overwrites input),
  `vocal-isolate.ts` (demucs when present, honest otherwise),
  `vad.ts` (silencedetect segments, pure parser), `enhance-pipeline.ts`
  (orchestrator: validate → analyze → enhance → isolate → VAD; original
  untouched; `skipped[]` records every unavailable stage).
- ✅ Wired into the recording worker: enhancement runs before transcription,
  the enhanced WAV is stored as a new `UploadedFileVersion` (label
  `enhanced`, full processing metadata JSON), and the transcript is produced
  from the enhanced audio when available.
- ✅ `src/canonical/composition-matcher.ts` (DONE): candidate search
  (Meilisearch title + transcript-head queries with its built-in DB fallback,
  then full-row fetch), pure scoring (title 0.45 / verse line-level 0.35 /
  trigram 0.20), `rankCandidates` drops scores < 0.25, caps at top-5, flags
  `meetsThreshold` at ≥ 0.62. Persists top-N `CompositionMatch` rows
  (candidate status), keeps confirmed/rejected on re-match. Runs in the
  recording worker after transcription (non-fatal, summarized in
  `extractedMetadata.compositionMatching`). User confirms/rejects via
  `POST /api/acquire/match` (owner-gated); matches surface on the status API
  and /record page. Never silently misidentifies — threshold only *suggests*.
- ✅ `src/canonical/canonical-corrector.ts` (DONE): Needleman-Wunsch line
  alignment (sub-threshold pairs score worse than gaps so unrelated lines
  stay unpaired), conservative correction — a line is replaced by canonical
  only at similarity ≥ 0.8, everything else stays verbatim; LCS word diffs;
  weighted similarity × coverage confidence; error-type classification
  (vocabulary/homophone/transliteration/segmentation). `TranscriptCorrection`
  saved as `pending` (one pending per upload, replaced on re-run; approved
  rows never overwritten) with `verifyTranscriptCorrection()` for moderators.
  Correction only runs against a user-CONFIRMED match — never a candidate —
  and is triggered from `POST /api/acquire/match` confirm; surfaced on the
  status API and /record page (original ASR always shown).
- ✅ /record corrected-transcript panel (DONE): read-only ASR↔corrected diff
  with word-level highlights rendered from the persisted `diffJson`
  (`alignedLines` exposed on the status API), plus a manual correction box
  that resubmits the user's edit via `POST /api/acquire/upload/[id]/correction`
  (owner-gated). The route recomputes an honest diff with `alignManualEdit()`
  (new pure export — user text kept verbatim, appended lines counted as real
  changes, original ASR never touched) and saves through
  `saveTranscriptCorrection` (`manual-edit` model marker, one pending per
  upload).
- `CompositionMatcher` (T2): candidate search (Meilisearch `q` + canonical
  fuzzy/phonetic over fragments), returns top-N `CompositionMatch` with
  confidence; never silently misidentifies (threshold + user confirm).
- `canonicalCorrector`: align ASR vs canonical text, produce
  original/corrected/diffs/confidence; store `TranscriptCorrection`.
- Failure handling API returns specific reasons (too noisy/short/silent/
  corrupted/unsupported/too large/low quality) + retry/re-record.

### T3 — Singing-aware ASR + model governance
- ✅ Schema (DONE): `TranscriptCorrection`, `ModelVersion`, `EvaluationDataset`,
  `EvaluationSample` (unique `sourceCorrectionId` for idempotent upserts),
  `EvaluationRun` models + back-relations on `User`/`UploadedFile`; pushed to
  dev Postgres. Previously the T2/T3 code referenced these but they were
  missing from `schema.prisma` entirely (runtime calls threw).
- ✅ Live eval samples (DONE): `appendApprovedCorrection()` in
  `src/eval/datasets.ts` — when a moderator approves a `TranscriptCorrection`
  via `verifyTranscriptCorrection`, an `EvaluationDataset` row
  ('Approved Human-Verified Corrections — Live', active) gains one sample
  (reference = approved corrected text, audio URL + model version provenance,
  idempotent per correction). The T3 eval loop now consumes real
  human-verified samples instead of only a status badge; regression mode
  (`materializeRegressionSamples`) and golden mode both see them.
- `ModelVersion` registry: ASR variants evaluated offline on
  `EvaluationDataset` (golden Marathi singing sets, rights-cleared),
  regression suite, WER/CER gates, A/B, rollback. Never auto-deploy.
- `TranscriptSegment` (word/line timestamps when confidence sufficient);
  lyrics sync is gated on segment confidence, never shown as fact otherwise.
- SSE status channel for long pipelines.

### T4 — Personal library, playlists, player
- ✅ Schema (DONE): `Playlist`, `PlaylistItem` (composition OR recording, never
  both), `PlaybackHistory`, `AudioFavorite` models + back-relations on
  `User`/`UploadedFile`/`Composition`; pushed to dev Postgres (`prisma db push`).
- ✅ `src/lib/library.ts` (DONE): ownership-checked recordings helpers —
  `listRecordings` (versions: original+enhanced, transcript, bookmark,
  last-played), rename, bookmark toggle (`AudioFavorite` upsert), `deleteRecording`
  (best-effort storage delete of original + ALL derived version files, then
  transactional cleanup of favorites/history/playlist items/moderation
  queue/versions/file row), `recordPlayback`.
- ✅ API routes (DONE, all owner-gated, 404-for-foreign):
  `GET /api/library/recordings`; `PATCH|DELETE /api/library/recordings/[id]`;
  `POST /api/library/recordings/[id]/bookmark`;
  `POST /api/library/recordings/[id]/playback`;
  `GET|POST /api/playlists`; `GET|PATCH|DELETE /api/playlists/[id]`;
  `POST|DELETE /api/playlists/[id]/items`; `PUT /api/playlists/[id]/reorder`
  (atomic id-set validation).
- ✅ Pages (DONE): `/library/recordings` (My Recordings: play via `play-track`
  event, inline rename, bookmark, delete incl. derived audio, transcript
  disclosure); `/playlists` (list + create); `/playlists/[id]` (play-all,
  add items via composition search + own recordings, reorder, remove,
  rename). `/library` gained a "माझी ऑडिओ लायब्ररी" section; mobile "अधिक"
  menu + `/record` "सर्व पहा" link to the new pages; composition reader
  "प्लेलिस्टमध्ये जतन करा" dropdown.
- ✅ Premium player (DONE, `components/floating-player.tsx`): NO fake
  SoundHelix defaults — renders nothing until a real track is queued
  (`add-to-queue` / `play-devotional-audio` / new `play-track` event); playback
  speed (0.5×–1.5× cycle); repeat off/all/one; queue + shuffle + reorder;
  fullscreen toggle; Media Session metadata + play/pause/prev/next/seekto/
  stop handlers + playbackState; keyboard shortcuts (space/arrows/m/n/p,
  only when the player is visible); synced lyrics (tap→seek). Pure logic
  extracted to `src/lib/player-logic.ts` (repeat cycle, shuffle order,
  next/prev, time format) — unit tested (10 tests).
- Synced lyrics with REAL timestamps (TranscriptSegment) remains future work
  — the player renders static lyrics when no timestamps exist.
- Share (shareable token for recordings) not yet built — recordings are
  private by default, which is the privacy baseline.

### T5 — Discovery, source quality, dedup, FAQ
- ✅ Scheduled discovery (DONE): `DiscoveryWorker` sweeps the `ContentSource`
  registry via `src/discovery/due-sources.ts` — per-source due selection
  (scrapeInterval + lastFetchAt + robots cache) ordered by composite quality
  score from `src/discovery/quality.ts` (trust/freshness/duplicate ratio/error
  rate/license/extraction reliability/approved ratio).
- ✅ Real acquisition routing (DONE): `src/discovery/acquire-runner.ts` maps
  scraperType → the exported `acquire()` cores of `acquire-wikisource.ts` /
  `acquire-internet-archive.ts` (refactored to reusable functions with thin
  CLI `main()`s); the worker's fake `*0.7` dedup placeholder and dead
  `resolveScraper`/`autoDiscover` paths were removed. Real `DiscoveryJob`
  rows now carry `itemsFound/new/duplicates`, duration, and result summary.
- ✅ Canonical dedup (DONE): the crawl pipeline's content-hash dedup runs for
  real against Postgres; added `normalizeCompositionType()` to map free-form
  type strings ('abhang', 'आरती') to the `CompositionType` enum — previously
  lowercase values crashed `composition.create` against Postgres (the SQLite
  shim tolerated them).
- ✅ Seeding (DONE): `seed-sources.ts` now includes the Marathi Wikisource
  (`wikisource-mr`) and Internet Archive gatha sources; 19 sources live in
  Postgres. End-to-end verified: a scoped cycle crawled 81 Wikisource pages
  through the real pipeline and wrote compositions + a `DiscoveryJob` row.
- Dedup across websites/books/OCR/uploads/recordings/DB → one canonical +
  `CanonicalSourceMapping` records (partial — content-hash level wired;
  cross-source phonetic/semantic canonical merge remains a follow-up).
- FAQ page (schema-driven, searchable, FAQ JSON-LD).

### T6 — Admin dashboard, analytics, hardening
- ✅ Admin audio dashboard (DONE): `GET /api/admin/audio` + retry API +
  `/admin/audio` page. Recording queue (rights + moderation + confidence),
  processing queue (kind, attempts/max, error), failed uploads + manual job
  retry, low-confidence transcripts (< 0.5), rights records + by-status
  split, composition-match counts, model version registry + pipeline
  versions in use + audio quality snapshot (loudness from enhanced metadata).
  Corrections tab: pending/approved/rejected `TranscriptCorrection`s with
  confidence, error type, model version, diff stats (words changed / lines
  corrected), ASR-vs-corrected previews, verifier, and links into the
  moderation room. Moderator verification workflow: line-by-line
  original↔corrected diff review with word-level highlighting, approve/reject
  via `verifyTranscriptCorrection` (`POST /api/admin/audio/corrections/[id]/verify`,
  admin-gated), verifier + notes recorded, status filter, and approved rows
  flagged as training/eval-eligible. Card + quick link on `/admin`.
- ⏳ Analytics (processing success/failure/time, noise effectiveness,
  confidence, match rate, discovery growth, playback) with minimal data.
- ⏳ Security/load/perf gates, mobile + dark/light + a11y verification.

---

## 3. Cross-cutting requirements (all tranches)

- **Privacy:** recordings private by default, owner-only, delete cascades to
  derived audio/transcript; explicit consent; no training on user audio
  without rights-cleared, human-verified, consented samples.
- **Rights:** `RightsRecord` per upload (USER_OWNED / PUBLIC_DOMAIN_COMPOSITION
  / USER_PERFORMANCE / THIRD_PARTY / UNKNOWN); never auto-publish copyrighted
  performances; `publicationPermission` must be explicit.
- **Honesty gates (spec §32):** no fake transcription/progress/results; every
  stage either executes with real tooling or reports exactly why it did not.
- **Testing:** unit/integration for every pure module; audio golden + ASR eval
  suites once ffmpeg/models available in CI; E2E for the record flow.

## 4. Verification commands (T1)

`bun run typecheck` · `bun test tests/unit/` · `npx eslint <touched files>` ·
`bun run db:generate` · `npx prisma db push` (additive).
