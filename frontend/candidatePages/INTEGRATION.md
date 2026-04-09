# Candidate Portal Integration

## Overview

The candidate portal is a Next.js 16 App Router app in `frontend/candidatePages`.

It now supports two backend modes:

1. `server.ts` on port `3002`
   Dev-only CSV-backed API for local UI work.
2. Unified Express backend on port `3001`
   Target shared platform backend for candidate, recruiter, and admin flows.

The frontend API client lives in `src/lib/api-client.ts` and uses:

```ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
```

For local CSV development, set:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

For unified backend integration, set:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Local Dev Topology

```text
Candidate Portal (Next.js)
  -> src/lib/api-client.ts
  -> http://localhost:3002/api/v1
  -> server.ts
  -> data/*.csv
```

CSV files seeded for candidate views:

- `data/jobs.csv`
- `data/matches.csv`
- `data/programs.csv`

CSV files managed dynamically by the dev server:

- `data/users.csv`
- `data/profiles.csv`
- `data/applications.csv`
- `data/bookmarks.csv`
- `data/program-applications.csv`
- `data/uploads.csv`

`server.ts` contains explicit TODO markers where the CSV logic should be replaced with unified backend or Supabase calls.

## Unified Platform Topology

```text
Candidate Portal (Next.js)
  -> Unified Express API on :3001
  -> Auth, jobs, applications, bookmarks, programs
  -> Resume Service on :8000 for parsing/scoring
  -> Shared database / durable storage
```

Recommended ownership split:

- Unified Express backend owns auth, candidate profile, jobs, applications, bookmarks, and Knowledge Factory data.
- Resume Service owns deterministic resume parsing and JD scoring.
- Candidate portal only calls `/api/v1/*`.
- Unified backend is responsible for forwarding to `resume_service` and persisting results.

## Resume Upload and AI Matching Flow

Target production flow:

1. Candidate uploads a resume from the Smart Match page.
2. Unified Express backend accepts multipart form-data at `POST /api/v1/resume/upload`.
3. Backend creates or reuses a `resume_id`.
4. Backend forwards the file to `resume_service` `POST /v1/parse` with:
   - `file`
   - `resume_id`
   - optional `candidate_type`
5. Backend stores parsed resume metadata and normalized resume output.
6. Backend calls `resume_service` `POST /v1/score` with:
   - `resume_id`
   - `job_context`
   - or explicit `normalized_resume` plus `resume_text` when needed
7. Backend stores match results keyed by candidate and job.
8. Candidate portal reads:
   - `GET /api/v1/matches`
   - `GET /api/v1/matches/insights`
   - `GET /api/v1/resume/:uploadId/parse-result`

Current dev-server behavior:

- `server.ts` returns a CSV-backed stub parse result.
- It does not forward to `resume_service` yet.
- It leaves TODO comments where forwarding logic should be added.

## Resume Service Contract

Resume Service location:

- `resume_service/main.py`
- `resume_service/schemas.py`

Relevant endpoints:

- `POST /v1/parse`
  - multipart form-data
  - required fields: `file`, `resume_id`
  - optional: `candidate_type` = `fresher | lateral`
- `POST /v1/score`
  - JSON
  - requires `resume_id` and `job_context`
  - may omit `normalized_resume` and `resume_text` if the resume was already parsed and stored

Important response fields used by the candidate portal:

- parse:
  - `resume_id`
  - `normalized_resume`
  - `resume_quality`
  - `parser_metadata`
- score:
  - `resume_id`
  - `jd_match_score`
  - `resume_quality_score`
  - `breakdown`
  - `matched_skills`
  - `missing_skills`
  - `recommendation`
  - `summary`

## JWT Auth Flow

The frontend client handles auth in `src/lib/api-client.ts`.

Flow:

1. `register` or `login` returns:
   - `access_token`
   - `refresh_token`
   - `user`
2. Tokens are stored in `localStorage`.
3. Every authenticated request adds:

```http
Authorization: Bearer <access_token>
```

4. On `401`, the client automatically calls `POST /api/v1/auth/refresh`.
5. If refresh succeeds, the original request is retried once.
6. If refresh fails, local tokens are cleared.

Storage keys:

- `coastal-careers.access-token`
- `coastal-careers.refresh-token`

## CORS Requirements

The unified backend should allow the candidate portal origin in development and production.

Recommended dev configuration:

- allow `http://localhost:3000` for Next.js dev
- allow credentials only if cookies are introduced later
- allow headers:
  - `Content-Type`
  - `Authorization`
  - `X-Request-Id` if request tracing is added
- allow methods:
  - `GET`
  - `POST`
  - `PUT`
  - `PATCH`
  - `DELETE`
  - `OPTIONS`

Current CSV dev server behavior:

- sends permissive `Access-Control-Allow-Origin: *`
- this is acceptable for local CSV stubbing only
- tighten this when switching to the unified backend

## Environment Variables

Example values:

```env
PORT=3002
API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
RESUME_SERVICE_URL=http://localhost:8000/v1
```

Meaning:

- `PORT`
  - port used by the candidate CSV dev server
- `API_URL`
  - target unified backend base URL used by server-side forwarding later
- `NEXT_PUBLIC_API_URL`
  - browser-facing candidate API base URL
- `RESUME_SERVICE_URL`
  - Resume Service base URL for future forwarding from Express

## Migration Checklist

When the unified backend is ready:

1. Point `NEXT_PUBLIC_API_URL` to `http://localhost:3001/api/v1`.
2. Replace CSV reads and writes in `server.ts` with unified backend calls or retire `server.ts`.
3. Wire `POST /api/v1/resume/upload` to forward files to `resume_service /v1/parse`.
4. Persist parse results and score results in shared storage.
5. Ensure `/api/v1/matches` and `/api/v1/matches/insights` reflect stored scoring output.
6. Restrict CORS to approved frontend origins.
7. Replace dev token generation with real JWT issuance and validation.
