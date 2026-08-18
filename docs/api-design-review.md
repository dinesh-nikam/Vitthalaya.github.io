# API Design Review — Audio Platform & Adjacent Surfaces

Status: **review + applied fixes**. This document follows the four-step
process of the `api-design-principles` skill: consumers → style →
errors/versioning/pagination/auth → validation. It records the design
decisions for the API surface added in T1–T5 and the fixes already applied to
close the gap with the project's shared standard.

---

## 1. Consumers, Use Cases & Constraints

| Consumer | Use case | Auth |
| -------- | -------- | ---- |
| `/record` page | Upload, poll status, review transcript diff, confirm match | NextAuth session |
| `/library/recordings`, `/playlists` pages | Manage recordings + playlists, play audio | NextAuth session |
| Admin dashboards (`/admin/*`) | Audio queue, corrections, model registry, discovery | `requireAdmin()` |
| Third-party/public | Read compositions/saints | `X-API-Key` (v1) |

**Constraints:**

- Session-cookie auth (NextAuth) for user routes; `requireAdmin()` for admin.
- Owner-gated resources return `404` (not `403`) — no existence leak.
- The shared standard `src/lib/api-response.ts` (success/error/pagination
  builders + `ApiErrors`) and `src/lib/api-auth.ts` (API-key auth, rate
  limits) already exist and are used by `/api/v1/*`, `/api/search`,
  `/api/orders`, `/api/community/corrections`. The audio routes predate their
  adoption.

---

## 2. API Style & Resource Modeling

**Style:** REST, resource-oriented nouns + HTTP verbs. RPC-style actions are
kept only where they are genuine operations (classify, verify, retry, run) and
are nested under their resource where possible.

**Resource hierarchy (audio):**

```
/api/acquire/upload                     POST   (create upload / enqueue)
/api/acquire/uploads                    GET    (list my uploads)
/api/acquire/upload/{id}                GET    (status: matches, rights, correction)
/api/acquire/upload/{id}/correction     POST   (manual transcript resubmit)
/api/acquire/match                      POST   (confirm/reject composition match)
/api/acquire/classify                   POST   (RPC: AI classification)
/api/library/recordings                 GET    (list my recordings)
/api/library/recordings/{id}            PATCH/DELETE
/api/library/recordings/{id}/bookmark   POST
/api/library/recordings/{id}/playback   POST
/api/playlists                          GET/POST
/api/playlists/{id}                     GET/PATCH/DELETE
/api/playlists/{id}/items               POST
/api/playlists/{id}/items/{itemId}      DELETE
/api/playlists/{id}/reorder             PUT
/api/admin/audio                        GET
/api/admin/audio/retry                  POST
/api/admin/audio/corrections/{id}/verify POST
/api/admin/models                       GET
/api/admin/models/lifecycle             POST
/api/admin/models/evaluate              POST
/api/admin/discovery/*                  GET/POST
```

**Assessment:** naming is resource-consistent; `{id}` params are path-based;
collections are plural nouns. The `bookmark`/`playback` sub-resources are
correctly nested under the recording.

---

## 3. Errors, Versioning, Pagination, Auth

### 3.1 Errors (standard: `errorResponse` / `ApiErrors`)

**Standard shape** (from `src/lib/api-response.ts`):

```jsonc
{ "error": "Human-readable message", "code": "UNAUTHORIZED", "details": {} }
```

Status codes: `400` validation, `401` unauthenticated, `404` not found
(owner-gated — also for foreign resources), `429` rate limited, `500` server.

**Applied fixes (this review):**

- `GET /api/acquire/uploads` → `ApiErrors.UNAUTHORIZED()` (was bare `{error}`).
- `GET /api/library/recordings` → `ApiErrors.UNAUTHORIZED()` / `INTERNAL_ERROR`.
- `POST /api/acquire/classify` → error paths now `errorResponse(..., code:
  'VALIDATION_ERROR')` + `ApiErrors.UNAUTHORIZED`/`INTERNAL_ERROR` (was
  `{ success: false, error }` — inconsistent with the rest of the API and
  with zero app callers, so safe to change).

### 3.2 Versioning

- **Public API:** versioned via URL prefix (`/api/v1/*`) with `X-API-Key`
  auth — already the standard.
- **Internal audio routes:** unversioned by design (session-auth, first-party
  pages only). A breaking change to an internal route is coordinated with the
  in-repo client. **Decision:** keep unversioned; if any audio surface becomes
  third-party-facing, move it under `/api/v1/` rather than versioning in
  place.

### 3.3 Pagination (standard: `parsePagination` / `buildPagination`)

**Standard envelope:**

```jsonc
{ "data": [...], "pagination": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 } }
```

Query params: `?page=1&limit=20` (limit clamped to 1–50).

**Applied fixes (this review):** list endpoints previously hardcoded
`take:` with no pagination metadata:

- `GET /api/acquire/uploads` — now `parsePagination` + `count` +
  `buildPagination`. Response is additive: `{ uploads, pagination }` so the
  `/record` client (reads `data.uploads`) keeps working.
- `GET /api/library/recordings` — same treatment; `listRecordings` gained
  `{ skip, take }` opts. Response: `{ recordings, pagination }`.

**Remaining pagination debt (follow-up):** `GET /api/playlists`,
`GET /api/admin/audio`, `GET /api/admin/discovery/history` still return
unpaginated arrays.

### 3.4 Auth

- Session cookie (`next-auth.session-token`) for user routes.
- `requireAdmin()` for all `/api/admin/*`.
- Owner-gating: library/recordings/playlists/correction routes verify
  `userId` and return `404` for foreign resources — consistent and correct.

---

## 4. Validation & Consistency Audit

Verified by running the dev server and exercising the changed routes:

| Route | Before | After | Verified |
| ----- | ------ | ----- | -------- |
| `GET /api/acquire/uploads?page=1&limit=5` | `{error}` + `take:50`, no pagination | `{error, code}` + `pagination` envelope | `401 {"error","code":"UNAUTHORIZED"}` |
| `GET /api/library/recordings?page=2&limit=10` | `{error}` + `take:100` | `{error, code}` + pagination | `401` standard envelope |
| `POST /api/acquire/classify` (unauthed) | `{success:false, error}` | `{"error","code":"UNAUTHORIZED"}` | live |

Gates: typecheck 0 errors, 265 unit tests pass, ESLint clean on all four
touched files.

---

## 5. Assumptions, Gaps & Follow-ups

**Assumptions:**

- Internal routes may evolve without versioning because the client is
  in-repo; public v1 is the frozen contract.
- Additive response fields (`pagination` alongside `uploads`/`recordings`)
  are considered non-breaking for existing clients.

**Gaps:**

- `/api/admin/audio`, `/api/admin/discovery/history`, `/api/admin/models`
  aggregates are single-object responses; page-sized lists (playlists,
  uploads, recordings, moderation queue) are paginated.
- The public v1 surface is frozen; internal routes evolve without versioning.
- The main `openapi.yaml` covers only auth/search/ai — its e-commerce and
  enrichment surfaces have no OpenAPI coverage yet (add
  `--coverage-root=docs/openapi/openapi.yaml:orders,...` once documented).

**Follow-ups (ordered):**

1. ~~Extend `ApiErrors` usage to remaining audio/moderation routes for `code`~~
   **Done** — every error response in the audio/moderation surface now carries
   a `code` discriminator (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
   `BAD_REQUEST`, `INTERNAL_ERROR`; upload validation uses
   `UNSUPPORTED_MEDIA_TYPE` / `PAYLOAD_TOO_LARGE`; 500s keep the thrown
   message via `errorResponse(msg, 500, { code: 'INTERNAL_ERROR' })`).
2. ~~Paginate `/api/playlists`~~ **Done** — additive `pagination` envelope;
   client loads more.
3. ~~Add rate limiting to upload/correction routes~~ **Done** — per-user
   buckets with `Retry-After` on 429.
4. ~~Add a CI doc-lint that fails when `docs/openapi/audio-platform.yaml`
   references a path that does not exist in `app/api`~~ **Done** —
   `scripts/doc-lint-openapi.ts` (`bun run doc:lint`) lints
   `audio-platform.yaml` + `openapi.yaml`, mapping `{id}` → `[id]` segments
   (rename-tolerant) and failing with exit 1 on any undocumented/missing
   route. Extended twice: it now also fails when a **documented HTTP method
   (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) is not exported** by the matching
   `route.ts`, and it runs the **reverse direction** — routes under a spec's
   coverage roots that aren't in the spec are reported as warnings, escalated
   to exit 1 with `--strict-undeclared` (coverage roots are extensible via
   `--coverage-root=SPEC:r1,r2`). The audio spec now documents the full audio
   surface (moderation + discovery included) so its coverage roots pass
   cleanly. Wired into CI (`verify.yml` alongside `typecheck`/`lint`, plus a
   bun step in `ci.yml`).
