# Audio Platform — REST API Reference

Reference for the audio/recording endpoints, extracted from the route
implementations. Auth is NextAuth session-based (Cookie) unless a route says
otherwise; admin routes additionally require `requireAdmin()` (role
`ADMIN`/`MODERATOR`). Owner-gated routes return `404` — not `403` — for
foreign or missing resources (no existence leak).

See also [audio-platform-architecture.md](./audio-platform-architecture.md).

---

## 1. Upload & Pipeline

### `POST /api/acquire/upload` — upload a file or YouTube URL (auth required)

Multipart form data:

| Field                    | Type     | Required | Notes                                          |
| ------------------------ | -------- | -------- | ---------------------------------------------- |
| `file`                   | Blob     | yes*     | Any supported format; `audio/webm` accepted    |
| `url`                    | string   | yes*     | YouTube URL (routed to `handleYouTubeUrl`)     |
| `title`                  | string   | no       | Custom title                                   |
| `isRecording`            | string   | no       | `"true"` for in-browser recorder output        |
| `rightsStatus`           | string   | no       | Rights declaration (recording page)            |
| `consentGranted`         | string   | no       | `"true"`/`"false"`                             |
| `publicationPermission`  | string   | no       | `"true"`/`"false"`                             |
| `attribution`            | string   | no       | Attribution string                             |

\* exactly one of `file` / `url` is required.

Responses: `200` (processed/queued), `400` (missing input / invalid),
`401` (unauthenticated), `500` (processing error with message).

### `GET /api/acquire/uploads` — my uploads list (owner-gated)

Returns the authenticated user's uploads (audio/recordings first), newest
first, `take: 50`. Each item: `id`, `originalName`, `format`, `mimeType`,
`sizeBytes`, `processingStatus`, `extractedText`, `extractionConfidence`,
`extractedMetadata`, `createdAt`.

### `GET /api/acquire/upload/[id]` — upload status (owner-gated)

Full status for one upload:

```jsonc
{
  "uploadId": "…",
  "originalName": "…",
  "format": "audio",
  "processingStatus": "completed",
  "processingSteps": [],
  "extractedText": "…",
  "extractionConfidence": 0.87,
  "audioUrl": "https://…",          // from extractedMetadata.audioUrl
  "job": { /* AudioProcessingJob or null */ },
  "moderation": { "id": "…", "status": "pending", "draftTitle": "…" },
  "rights": { "rightsStatus": "…", "consentGranted": true, "publicationPermission": true },
  "matches": [ { /* CompositionMatch candidates */ } ],
  "correction": {
    "id": "…",
    "originalAsr": "…",
    "correctedText": "…",
    "canonicalText": "…",
    "diffJson": { "version": 1, "alignedLines": [], "stats": {} },
    "confidence": 0.9,
    "errorType": "…",
    "modelVersion": "whisper",
    "status": "pending",
    "createdAt": "…"
  }
}
```

### `POST /api/acquire/upload/[id]/correction` — manual transcript resubmit (owner-gated)

Body: `{ "correctedText": string }` (non-empty). Recomputes an honest
word-level diff against the **original ASR** via `alignManualEdit` and saves
through `saveTranscriptCorrection` (one pending correction per upload).
Returns the fresh correction payload (same shape as the `correction` block
above). Errors: `400` empty text / no original transcript, `401`, `404`.

### `POST /api/acquire/match` — confirm/reject a composition match (owner-gated)

Body: `{ "uploadId": string, "compositionId": string, "action": "confirm" | "reject" }`.
On `confirm` runs `confirmCompositionMatch` + `runCanonicalCorrection`.
Errors: `400` missing fields/invalid action, `401`, `404`.

### `POST /api/acquire/classify` — AI classification of extracted text (auth required)

Body: `{ "text": string (≥10 chars), "title?": string, "fileId?": string }`.
Returns `{ success: true, result: ClassificationResult }` or
`{ success: false, error }`.

---

## 2. Personal Library (T4)

### `GET /api/library/recordings` — my recordings (owner-gated)

Returns `{ recordings: RecordingListItem[] }` — audio uploads with playable
version URLs (enhanced preferred), transcript preview, bookmark state,
last-played info.

### `PATCH /api/library/recordings/[id]` — rename (owner-gated)

Body: `{ "name": string }`. Returns `{ originalName }`. Errors: `400` invalid
name, `401`, `404`.

### `DELETE /api/library/recordings/[id]` — delete incl. derived audio (owner-gated)

Deletes the recording and everything derived (original + all version storage
files, transcript, bookmarks, playback history, playlist items, moderation
rows) in one transaction. Returns `{ ok: true }`. Errors: `401`, `404`, `500`.

### `POST /api/library/recordings/[id]/bookmark` — toggle bookmark (owner-gated)

Returns `{ bookmarked: boolean }` (or similar toggle result). Errors:
`401`, `404`, `500`.

### `POST /api/library/recordings/[id]/playback` — record a play (owner-gated)

Body: `{ durationSeconds?: number, completed?: boolean }`. Returns
`{ ok: true, historyId }`. Errors: `401`, `404`, `500`.

---

## 3. Playlists (T4)

### `GET /api/playlists` / `POST /api/playlists` — list / create (auth)

`POST` body: `{ "name": string }` → `201 { playlist }`. Errors: `400`
(missing name), `401`, `500`.

### `GET|PATCH|DELETE /api/playlists/[id]` — detail / rename / delete (owner-gated)

- `PATCH` body: `{ "name": string }` → `{ playlist }`.
- `DELETE` → `{ ok: true }`.
- Errors: `400`, `401`, `404`, `500`.

### `POST /api/playlists/[id]/items` — add item (owner-gated)

Body: exactly one of `compositionId` **or** `uploadedFileId` (never both —
`assertSingleTarget`). → `201 { item }`. Errors: `400` (ambiguous target,
duplicate), `401`, `404`.

### `DELETE /api/playlists/[id]/items/[itemId]` — remove item (owner-gated)

→ `{ ok: true }`. Errors: `401`, `404`.

### `PUT /api/playlists/[id]/reorder` — reorder items (owner-gated)

Body: `{ "itemIds": string[] }` (full desired order). → `{ ok: true }`.
Errors: `400` (not an array of strings), `401`, `404`.

---

## 4. Admin — Audio Dashboard & Moderation (T6)

All admin routes require `requireAdmin()`; unauthenticated → `401`.

### `GET /api/admin/audio` — dashboard aggregate

Returns recording queue (uploads `format=audio` with rights + moderation),
processing queue (`AudioProcessingJob` by status), failed uploads + retry
state, low-confidence transcripts (`< 0.5`), rights records grouped by status,
composition-match counts, model registry, pipeline versions in use, audio
quality snapshot, and transcript corrections with confidence + error type.

### `POST /api/admin/audio/retry` — retry a job

Body: `{ "jobId": string }` → resets the job to `pending` with a fresh
attempt budget (clears `errorMessage`). Errors: `400` missing `jobId`,
`401`, `404`, `500`.

### `POST /api/admin/audio/corrections/[id]/verify` — approve/reject a correction

Body: `{ "action": "approve" | "reject", "notes?": string }`. On approve,
`verifyTranscriptCorrection` **writes a sample into the live
`EvaluationDataset`** (idempotent per correction). Returns
`{ success, correctionId, status, verifier }`. Errors: `400` (bad action),
`401`, `404`, `500`.

---

## 5. Admin — Model Governance (T3)

### `GET /api/admin/models` — registry + datasets + recent runs

Returns the `ModelVersion` registry with latest eval runs, frozen golden
datasets, recent `EvaluationRun` rows, and active gate thresholds.

### `POST /api/admin/models/lifecycle` — register / activate / rollback / retire / seed

Body: `{ "action": "register" | "activate" | "rollback" | "retire" | "seed",
"modelVersionId"?: string, "modelName"?: string, "modelType"?: string,
"version"?: string, "provider"?: string, "config"?: object, "notes"?: string }`.

- `activate` is **refused** unless the model's latest evaluation run passed
  its WER/CER gates — never auto-deployed.
- `seed` runs `seedGoldenDatasetsFromCatalog` +
  `seedRegressionDatasetFromApprovedCorrections`.

### `POST /api/admin/models/evaluate` — run a gated evaluation

Body: `{ "modelVersionId": string, "mode": "golden" | "regression",
"datasetId"?: string, "hypotheses"?: Record<string,string>, "actorId"?: string,
"notes"?: string, "thresholds"?: GateThresholds }`.

Golden mode requires hypotheses (sampleId → text); samples without one are
skipped and **counted**. Regression mode uses real approved corrections
(reference = approved correctedText, hypothesis = verbatim original ASR).
Returns an `EvaluationSummary` with aggregate WER/CER, gate result, A/B
baseline comparison, and per-sample metrics.

---

## 6. Admin — Discovery (T5)

### `GET /api/admin/discovery/stats` — registry + jobs summary

### `GET /api/admin/discovery/sources` — list `ContentSource` registry

### `GET|PATCH|DELETE /api/admin/discovery/sources/[id]` — source detail / update / delete

### `POST /api/admin/discovery/run` — trigger a discovery cycle

Optional `sourceId` (query param or body) for a single source; otherwise runs
all active sources. Returns `{ cycleType: "single"|"full", result|report }`
with `itemsFound` / `itemsNew` / `itemsDuplicates` / `durationMs`.

### `GET /api/admin/discovery/history` — recent `DiscoveryJob` rows

### `GET /api/admin/discovery/alerts` — discovery alerts

---

## Shared error envelope

```jsonc
{ "error": "Human-readable message" }
```

Status codes: `400` validation, `401` unauthenticated, `404` not found
(owner-gated — also used for foreign resources), `500` server error.
