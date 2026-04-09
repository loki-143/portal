# Portal Schemas

This document describes the unified portal’s **TypeScript data models**, **CSV storage format**, and **API contracts**.

## Source of truth

The portal uses CSV files as the database:

- `data/jobs.csv`
- `data/applications.csv`
- `data/users.csv`
- `data/automations.csv`

The server reads the CSV fresh on each request and rewrites the full CSV on mutations.

## TypeScript models

Defined in `src/types/index.ts`.

### Job

- `JobStatus`: `Active | Draft | Closed`

```ts
export interface Job {
  id: number;
  title: string;
  department: string;
  location: string;
  status: 'Active' | 'Draft' | 'Closed';
  applicants: number;
  newToday: number;
  postedDate: string; // YYYY-MM-DD
  timeToHireDays: number | null;
}
```

### Application

- `ApplicationStatus`: `Pending | Shortlisted | Rejected`

```ts
export interface Application {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  match: number;
  status: 'Pending' | 'Shortlisted' | 'Rejected';
  date: string; // YYYY-MM-DD
  avatarSeed: string;
}
```

### User

- `UserRole`: `admin | recruiter`
- `UserStatus`: `Active | Disabled | Inactive`

```ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'recruiter';
  status: 'Active' | 'Disabled' | 'Inactive';
  initials: string;
  color?: string; // optional Tailwind class string for avatar styling
}
```

### Automation

- `AutomationType`: `Welcome | Rejection | Shortlist`

```ts
export interface Automation {
  id: number;
  type: 'Welcome' | 'Rejection' | 'Shortlist';
  template: string;
  enabled: boolean;
}
```

## CSV formats

### `data/jobs.csv`

Headers:

```text
id,title,department,location,status,applicants,newToday,postedDate,timeToHireDays
```

Notes:
- `timeToHireDays` may be blank in CSV, which maps to `null`.

### `data/applications.csv`

Headers:

```text
id,name,email,phone,role,match,status,date,avatarSeed
```

### `data/users.csv`

Headers:

```text
id,name,email,role,status,initials,color,passwordHash
```

Notes:
- `color` may be empty.
- `passwordHash` is stored server-side for authentication and is never returned to the frontend.

### `data/automations.csv`

Headers:

```text
id,type,template,enabled
```

Notes:
- `template` may include commas and quotes; it is stored as a quoted CSV field.
- `enabled` is `true`/`false`.

## API contracts

Base URL (frontend):

- `VITE_API_URL` if set, otherwise `http://localhost:3001/api`

### Authentication

Most endpoints require an `Authorization` header:

```text
Authorization: Bearer <token>
```

- `POST /api/auth/login` → `{ token: string, user: User }`
  - Body: `{ email, password }`
  - If the user row has no `passwordHash` yet, the first successful login sets it (bootstrap).
- `GET /api/auth/me` → `{ user: User }`

Notes:
- `user` responses never include `passwordHash`.

### Jobs

- `GET /api/jobs` → `Job[]`
- `POST /api/jobs` → `Job`
  - Body supports: `title`, `department`, `location`, `status`, `applicants`, `newToday`, `postedDate`, `timeToHireDays`
  - Server assigns `id`.
- `GET /api/jobs/:id` → `Job`
- `PATCH /api/jobs/:id` → `Job`
  - Partial updates.
- `DELETE /api/jobs/:id` → `{ ok: true }`

### Applications

- `GET /api/applications` → `Application[]`
- `POST /api/applications` → `Application`
  - Server assigns `id` and can derive `avatarSeed` from `name` if omitted.
- `GET /api/applications/:id` → `Application`
- `PATCH /api/applications/:id` → `Application`
  - Supports status update (and ignores other fields today).

### Users

- `GET /api/users` → `User[]`
- `POST /api/users` → `User`
  - Admin-only.
  - Body supports: `name`, `email`, `role`, `status`, `initials`, `color`, and `password`.
  - Server assigns `id` and computes `initials` if missing/blank.
- `PATCH /api/users/:id` → `User`
  - Admin-only.
  - Supports updating fields and optional `password` reset.
- `DELETE /api/users/:id` → `{ ok: true }`
  - Admin-only.

### Automations

- `GET /api/automations` → `Automation[]`
- `POST /api/automations/email` → `Automation`
  - Body: `{ type, template, enabled? }`
  - Updates the row matching `type`.

Notes:
- Automations endpoints are admin-only.

### Bulk upload

- `POST /api/bulk-upload` → `{ message: string, count: number }`
  - Placeholder endpoint; UI uses it to simulate batch ingestion.
