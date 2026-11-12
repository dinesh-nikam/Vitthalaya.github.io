# API Engineering Guidelines & Architecture Rules

This file governs all endpoints located within `app/api/` for Digital Pandharpur.

## Mandatory Contracts

1. **OpenAPI Specification Synchronization**:
   - Every route and HTTP method under `app/api/` must have a matching entry in `docs/openapi/audio-platform.yaml` and `docs/openapi/openapi.yaml`.
   - Never consider an API change complete without passing `bun run doc:lint`.

2. **Layered Architecture & Separation of Concerns**:
   - Route handlers (`route.ts`) act strictly as HTTP controllers: they parse incoming requests, validate query/body parameters, invoke service/repository methods, and return standard `NextResponse` payloads.
   - Never embed direct business calculations or complex database queries inside route handlers.

3. **Input Validation & Sanitization**:
   - Validate all route parameters and request bodies using Zod schemas before processing.
   - Sanitize search terms and user inputs to prevent injection attacks and invalid character encoding.

4. **Rate Limiting & Authentication**:
   - Sensitive and write endpoints must integrate with the workspace rate limiter (`src/lib/rate-limit.ts`) and Auth.js session verification.
   - Return HTTP 429 (`RATE_LIMITED`) with a standard `Retry-After` header when rate limits are exceeded.

5. **Error Formatting**:
   - Always return consistent JSON error envelopes:
     ```json
     {
       "error": {
         "code": "INVALID_PARAMETERS",
         "message": "Human-readable description"
       }
     }
     ```
   - Standard HTTP codes: `200`/`201` (Success), `400` (Validation failure), `401`/`403` (Authentication/Authorization), `404` (Not Found), `429` (Rate Limited), `500` (Internal Server Error).
