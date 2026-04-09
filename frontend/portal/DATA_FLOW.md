# Data Flow

This document explains how data moves through the unified portal.

## High-level flow

1. **Page** calls the typed API client.
2. **API client** (`src/services/api.ts`) performs a `fetch()` to the Express server.
3. **Express server** (`server.ts`) reads the relevant CSV file from `data/*.csv`.
4. The server **parses CSV → typed objects**, performs the requested mutation, then **writes a full CSV rewrite**.
5. The server returns JSON; the page updates local UI state.

## Frontend layers

- Pages live in `src/pages/*` and must not import CSV directly.
- All server calls go through `src/services/api.ts` (typed wrappers).

### Authentication

- Users sign in via `/login`.
- The frontend stores the issued token in localStorage (`portal_token`).
- `src/services/api.ts` automatically attaches `Authorization: Bearer <token>` to API requests.

### API base URL

- The client uses `import.meta.env.VITE_API_URL` if set.
- Otherwise it defaults to `http://localhost:3001/api`.

## Backend layers

### Express + Vite integration

- In development, `server.ts` runs Express on port `3001` and mounts Vite middleware (SPA).
- In production, it serves `dist/`.

### CSV read/write behavior

- Every request re-reads from disk (no in-memory cache).
- Mutations:
  - read current rows
  - compute next state
  - rewrite full CSV using `stringifyCsv(...)`

The parsing/stringifying implementation lives in:

- `src/lib/csv-parser.ts`

## Role-based UX

- Role (`admin` vs `recruiter`) is derived from the authenticated user.
- Routes are guarded in `src/App.tsx`:
  - `/users` is admin-only.
  - `/applications` and `/bulk-upload` are recruiter-only.
  - `/jobs` and `/create-job` are shared.

## Page → endpoint mapping

- Login (`/login`)
  - `POST /api/auth/login`
  - `GET /api/auth/me` (session restore)

- Dashboard (`/`)
  - `GET /api/jobs`
  - `GET /api/applications`
  - `GET /api/users` (admin role only)

- Jobs Management (`/jobs`)
  - `GET /api/jobs`
  - `GET /api/applications` (for metrics)
  - `PATCH /api/jobs/:id` (status changes)
  - `DELETE /api/jobs/:id` (delete draft)

- Applications (`/applications`)
  - `GET /api/applications`
  - `PATCH /api/applications/:id` (shortlist/reject)

- Create Job (`/create-job`)
  - `POST /api/jobs` (creates Draft or Active)

- Bulk Upload (`/bulk-upload`)
  - `POST /api/bulk-upload` (placeholder)

- Users Management (`/users`)
  - `GET /api/users`
  - `POST /api/users`
  - `PATCH /api/users/:id`
  - `DELETE /api/users/:id`

- Settings (`/settings`)
  - `GET /api/automations` (admin-only UI section)
  - `POST /api/automations/email` (admin-only UI section)

## Error handling

- The API client throws `Error(message)` for non-2xx responses.
- Pages render a simple error card near the top when a request fails.
