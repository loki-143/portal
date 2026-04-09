# Candidate Portal Schemas

## TypeScript Sources

Primary shared types live in:

- `src/types/index.ts`

Frontend CSV parsing helpers live in:

- `src/lib/csv-parser.ts`

Dev CSV persistence helpers live in:

- `src/lib/dev-csv-store.ts`

## Core Interfaces

### `Job`

Used by:

- `src/app/jobs/page.tsx`
- `src/app/smart-match/page.tsx`

Shape:

```ts
type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "Full-time" | "Contract" | "Part-time" | "Internship";
  salary: string;
  description: string;
  icon: string;
  status: "active" | "closed";
  postedDate: string;
  company_name?: string;
  remote_ok?: boolean;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: "yearly" | "daily" | "hourly";
  application_deadline?: string;
  match_score?: number;
  matched_tags?: string[];
};
```

### `MatchResult`

Based on `resume_service` `ScoreResumeResponse`, with UI-friendly job linkage fields.

Used by:

- `src/app/smart-match/page.tsx`
- `src/app/dashboard/candidate/page.tsx`

Shape:

```ts
type MatchResult = {
  id: string;
  candidateName: string;
  resume_id: string;
  jobId: string;
  jobTitle: string;
  jd_match_score: number;
  resume_quality_score: number;
  breakdown: {
    jd_match: Record<string, number>;
    resume_quality: Record<string, number>;
  };
  matched_skills: string[];
  missing_skills: string[];
  recommendation: "SHORTLIST" | "REVIEW" | "REJECT";
  summary?: string;
  company_name?: string;
  location?: string;
  job_type?: "Full-time" | "Contract" | "Part-time" | "Internship";
  salary_min?: number;
  salary_max?: number;
  salary_period?: "yearly" | "daily" | "hourly";
  posted_at?: string;
};
```

### `KnowledgeFactoryProgram`

Used by:

- `src/app/knowledge-factory/page.tsx`

Shape:

```ts
type KnowledgeFactoryProgram = {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  eligibility: string;
  deadline: string;
  status: "Open" | "Closed" | "Upcoming";
  start_date?: string;
  duration_weeks?: number;
  mentor_count?: number;
  spots_available?: number;
  spots_total?: number;
  tags?: string[];
};
```

### `CandidateProfile`

Used by:

- `src/app/dashboard/candidate/page.tsx`
- future profile editing flows

Key fields:

```ts
type CandidateProfile = {
  id: string;
  email: string;
  role: "candidate" | "recruiter" | "admin";
  first_name: string;
  last_name: string;
  headline: string;
  location: string;
  phone: string;
  linkedin_url?: string;
  portfolio_url?: string;
  bio: string;
  skills: string[];
  experience_years: number;
  education: EducationEntry[];
  work_preferences: WorkPreferences;
  resume_id?: string;
  avatar_url?: string;
};
```

### `Application`

Used by:

- `src/app/dashboard/candidate/page.tsx`
- future application detail pages

Key fields:

```ts
type Application = {
  id: string;
  job_id: string;
  job_title?: string;
  company_name?: string;
  location?: string;
  status:
    | "Applied"
    | "Under Review"
    | "Shortlisted"
    | "Interview"
    | "Decision";
  applied_at?: string;
  cover_letter?: string;
  resume_url: string;
  portfolio_url?: string;
  answers_to_screening_questions?: { question_id: string; answer: string }[];
  timeline?: { status: string; changed_at: string; notes?: string }[];
};
```

## CSV Schemas

### `data/jobs.csv`

Columns:

| Column | Type | Example |
|---|---|---|
| `id` | string | `job_001` |
| `title` | string | `Senior Product Engineer` |
| `department` | string | `Engineering` |
| `location` | string | `San Francisco / Remote` |
| `type` | string | `Full-time` |
| `salary` | string | `$160k - $210k` |
| `description` | string | `Lead the development...` |
| `icon` | string | `developer_mode` |
| `status` | string | `active` |
| `postedDate` | ISO date string | `2026-04-01` |

Notes:

- Parsed by `readJobs()`
- Salary metadata such as min/max/currency/period is derived in `dev-csv-store.ts`
- Extra metadata like `company_name` and `matched_tags` is currently added from in-code lookup tables

### `data/matches.csv`

Columns:

| Column | Type | Example |
|---|---|---|
| `id` | string | `match_001` |
| `candidateName` | string | `Sarah Johnson` |
| `resumeId` | string | `resume_sarah_001` |
| `jobId` | string | `job_001` |
| `jobTitle` | string | `Senior Product Engineer` |
| `matchScore` | integer | `98` |
| `qualityScore` | integer | `91` |
| `recommendation` | enum | `SHORTLIST` |
| `matchedSkills` | pipe-delimited string | `React|TypeScript|Design Systems` |
| `missingSkills` | pipe-delimited string | `WebGL` |
| `summary` | string | `JD match 98/100...` |

Notes:

- Parsed by `readMatches()`
- Merged with `jobs.csv` metadata to produce UI-ready `MatchResult`
- Mirrors `resume_service` scoring output

### `data/programs.csv`

Columns:

| Column | Type | Example |
|---|---|---|
| `id` | string | `prog_001` |
| `name` | string | `AI Product Innovation Track` |
| `category` | string | `Product` |
| `description` | string | `Work on high-impact AI product projects...` |
| `duration` | string | `12 weeks` |
| `eligibility` | string | `Final-year students...` |
| `deadline` | ISO date string | `2026-05-15` |
| `status` | enum | `Open` |

Notes:

- Parsed by `readPrograms()`
- Secondary metadata like `mentor_count`, `spots_available`, and `tags` is currently enriched in `dev-csv-store.ts`

## Dev Server CSV Tables

These are auto-created by `ensureCandidateDataFiles()`:

| File | Purpose |
|---|---|
| `users.csv` | auth stub users and refresh tokens |
| `profiles.csv` | candidate profile records |
| `applications.csv` | candidate job applications |
| `bookmarks.csv` | saved jobs |
| `program-applications.csv` | Knowledge Factory submissions |
| `uploads.csv` | resume upload / parse-result records |

## Page-to-Data Mapping

| Page | Data |
|---|---|
| `src/app/jobs/page.tsx` | `jobs.list()` with `Job[]` fallback |
| `src/app/smart-match/page.tsx` | `matches.list()` plus `jobs.list()` |
| `src/app/dashboard/candidate/page.tsx` | `profile.get()`, `applications.listMine()`, `matches.list()`, `matches.getInsights()` |
| `src/app/knowledge-factory/page.tsx` | `knowledgeFactory.listPrograms()` |

## Resume Service Formats

Source of truth:

- `resume_service/main.py`
- `resume_service/schemas.py`

### `POST /v1/parse`

Request:

- content type: `multipart/form-data`
- required fields:
  - `file`
  - `resume_id`
- optional field:
  - `candidate_type`: `fresher | lateral`

Response:

```ts
type ParseResumeResponse = {
  resume_id: string;
  candidate_type: "fresher" | "lateral";
  normalized_resume: Record<string, unknown>;
  warnings: string[];
  missing_fields: string[];
  resume_quality: {
    score: number;
    breakdown: Record<string, number>;
    recommendation: string;
    summary?: string;
  };
  parser_metadata: {
    filename: string;
    file_type: string;
    content_type?: string;
    file_size_bytes: number;
    line_count: number;
    page_count: number;
    extractor_name?: string;
    section_order: string[];
    detected_columns: number;
    is_scanned: boolean;
    content_fingerprint?: string;
    sensitive_findings: string[];
    extracted_text: string;
  };
};
```

### `POST /v1/score`

Request:

```ts
type ScoreResumeRequest = {
  resume_id: string;
  normalized_resume?: Record<string, unknown>;
  resume_text?: string;
  job_context: {
    job_id?: string;
    title?: string;
    description?: string;
    required_skills: string[];
    preferred_skills: string[];
    keywords: string[];
    experience_min_years?: number;
    experience_max_years?: number;
    location?: string;
  };
};
```

Rules:

- send `resume_id` plus `job_context` to score a previously parsed resume
- if `normalized_resume` is provided, `resume_text` must also be provided

Response:

```ts
type ScoreResumeResponse = {
  resume_id: string;
  jd_match_score: number;
  resume_quality_score: number;
  breakdown: {
    jd_match: Record<string, number>;
    resume_quality: Record<string, number>;
  };
  matched_skills: string[];
  missing_skills: string[];
  recommendation: string;
  warnings: string[];
  summary?: string;
};
```

## Candidate API Endpoints

The candidate portal client currently wraps these endpoint groups:

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### Profile

- `GET /api/v1/profiles/me`
- `PUT /api/v1/profiles/me`

### Jobs

- `GET /api/v1/jobs`
- `GET /api/v1/jobs/:jobId`
- `POST /api/v1/jobs/:jobId/bookmark`
- `DELETE /api/v1/jobs/:jobId/bookmark`
- `GET /api/v1/jobs/bookmarked`

### Applications

- `POST /api/v1/applications`
- `GET /api/v1/applications/me`
- `GET /api/v1/applications/:applicationId`

### Resume / Matches

- `POST /api/v1/resume/upload`
- `GET /api/v1/resume/:uploadId/parse-result`
- `GET /api/v1/matches`
- `GET /api/v1/matches/insights`

### Knowledge Factory

- `GET /api/v1/knowledge-factory/programs`
- `GET /api/v1/knowledge-factory/programs/:programId`
- `POST /api/v1/knowledge-factory/programs/:programId/apply`
- `GET /api/v1/knowledge-factory/applications/me`
