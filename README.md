# Knowledge Factory - Unified Talent Hiring Portal

A full-stack, multi-portal hiring platform built with **Next.js**, **Express**, **FastAPI**, and **Supabase (PostgreSQL)**. It supports three distinct user experiences:

- **Portal (Recruiter/Admin)** — Manage jobs, applications, interviews, users, and Knowledge Factory programs
- **Candidate Portal** — Browse jobs, apply, upload resumes, bookmark, track applications, and apply to programs
- **Resume Service** — Python microservice for deterministic resume parsing and JD scoring

---

## Table of Contents

- [What Is This Platform?](#what-is-this-platform)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Quick Start (TL;DR)](#quick-start-tldr)
- [Step-by-Step Setup](#step-by-step-setup)
  - [1. Supabase Database Setup](#1-supabase-database-setup)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Install Dependencies](#3-install-dependencies)
  - [4. Start All Services](#4-start-all-services)
  - [5. Verify Setup](#5-verify-setup)
- [Default Login Credentials](#default-login-credentials)
- [How to Run (Multiple Options)](#how-to-run-multiple-options)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Features by Phase](#features-by-phase)
- [Network Access (Other Devices)](#network-access-other-devices)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Production Checklist](#production-checklist)
- [Available Scripts](#available-scripts)
- [Documentation Files](#documentation-files)

---

## What Is This Platform?

A complete hiring platform that handles the **entire candidate journey** — from registration and job browsing to application submission, interview scheduling, and Knowledge Factory program applications. Recruiters and admins manage the full lifecycle from job posting to hire.

**Key capabilities:**
- Role-based access control (Admin, Recruiter, Candidate)
- JWT authentication with refresh tokens
- Resume parsing and JD matching via Python microservice
- Real-time job filtering with debounced search
- Application tracking with 9 status stages
- Interview scheduling with feedback and ratings
- Bookmark/favorite jobs
- Knowledge Factory program applications with file uploads
- Toast notifications on all user actions
- CSV fallback mode for development without Supabase

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                          Browser                              │
└──────────┬──────────────────────────┬────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌──────────────────────────┐
│  Candidate Portal    │   │  Portal (Recruiter/Admin) │
│  (Next.js)           │   │  (Vite + React)           │
│  Port 3000           │   │  Port 3001                │
└──────────┬──────────┘   └──────────┬───────────────┘
           │                         │
           ▼                         │
┌─────────────────────┐              │
│  Candidate API       │              │
│  (Express Proxy)     │              │
│  Port 3002           │              │
└──────────┬──────────┘              │
           │                         │
           └───────────┬─────────────┘
                       │
           ┌───────────▼───────────────────┐
           │   Portal Backend API          │
           │   (Express + Supabase)        │
           │   Port 3001                   │
           └───────────┬───────────────────┘
                       │
           ┌───────────▼───────────────────┐
           │   Supabase (PostgreSQL)       │
           │   Row Level Security          │
           └───────────────────────────────┘

External Service:
┌──────────────────────────────────┐
│  Resume Service (FastAPI)        │
│  Port 8000                       │
│  POST /v1/parse                  │
│  POST /v1/score                  │
└──────────────────────────────────┘
```

**Data flow:**
1. Candidate uploads resume → Candidate API (3002) → Resume Service (8000) parses it
2. Candidate applies/bookmarks → Candidate API (3002) → Portal Backend (3001) → Supabase
3. Recruiter creates job → Portal Backend (3001) → Supabase
4. Candidate views jobs → Candidate API (3002) → Portal Backend (3001) → Supabase

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Candidate Frontend** | Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Sonner (toasts) |
| **Portal Frontend** | Vite + React, React Router, TypeScript, Tailwind CSS, Sonner (toasts) |
| **Portal Backend** | Express.js, TypeScript, Supabase JS SDK, JWT, bcryptjs, CORS, UUID |
| **Candidate API** | Express.js, TypeScript (proxy server) |
| **Resume Service** | Python 3.11+, FastAPI, Uvicorn, Pydantic, pypdf |
| **Database** | PostgreSQL (via Supabase) with Row Level Security |
| **Auth** | JWT tokens (7-day access, 30-day refresh), bcrypt (12 rounds) |
| **Build Tools** | npm, pip, setuptools |

---

## Prerequisites

Before you begin, ensure you have:

| Requirement | Version | Why |
|------------|---------|-----|
| **Node.js** | 18+ | Running all frontend/API servers |
| **npm** | bundled with Node | Package management |
| **Python** | 3.11+ | Resume service |
| **pip** | bundled with Python | Python package management |
| **Supabase account** | Free tier works | Database + auth backend |
| **PowerShell** | 7+ (Windows) | Running startup scripts |
| **Git** | Any version | Version control |

---

## Project Structure

```
Portal/
├── database/
│   ├── schema.sql                  # Complete PostgreSQL schema (11 tables)
│   ├── seed.sql                    # Initial seed data (3 users, 5 jobs, 3 programs)
│   └── cleanup_duplicates.sql      # Remove duplicate users after re-seeding
│
├── frontend/
│   ├── portal/                     # Recruiter/Admin Portal (Vite + React)
│   │   ├── server.ts               # Unified backend API (Express + Supabase)
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── unified.ts      # Shared TypeScript types across all portals
│   │   │   │   └── index.ts        # Re-exports from unified
│   │   │   ├── services/
│   │   │   │   └── api.ts          # Full API client with token management
│   │   │   ├── context/
│   │   │   │   └── auth.tsx        # JWT authentication context
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   ├── CreateJob.tsx
│   │   │   │   ├── Jobs.tsx
│   │   │   │   ├── Applications.tsx
│   │   │   │   ├── Interviews.tsx
│   │   │   │   └── ...
│   │   │   └── App.tsx             # Main router
│   │   ├── package.json
│   │   ├── .env / .env.example
│   │   └── vite.config.ts
│   │
│   ├── candidatePages/             # Candidate Portal (Next.js)
│   │   ├── server.ts               # API proxy + resume/match handlers
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── jobs/page.tsx   # Job listing with filters
│   │   │   │   ├── login/page.tsx  # Candidate login
│   │   │   │   ├── register/page.tsx
│   │   │   │   ├── apply/page.tsx  # Application form
│   │   │   │   ├── bookmarks/page.tsx
│   │   │   │   ├── interviews/page.tsx
│   │   │   │   ├── knowledge-factory/page.tsx
│   │   │   │   └── ...
│   │   │   ├── components/
│   │   │   │   └── Header.tsx
│   │   │   └── lib/
│   │   │       ├── api-client.ts   # API client with auth helpers
│   │   │       └── toast.ts        # Toast notification utility
│   │   ├── package.json
│   │   ├── .env / .env.local
│   │   ├── next.config.ts
│   │   └── layout.tsx
│   │
│   ├── adminPages/                 # Admin Portal (uses portal backend)
│   └── recruitersPage/             # Recruiter Portal (uses portal backend)
│
├── resume_service/                 # Python resume parsing microservice
│   ├── resume_service/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── parse.py                # Resume parsing logic
│   │   ├── score.py                # JD scoring logic
│   │   └── tests/
│   ├── pyproject.toml              # Python dependencies
│   └── ...
│
├── start-all.ps1                   # Start all servers at once
├── kill-ports.ps1                  # Kill processes on ports 3001-3003
├── pyproject.toml                  # Root Python config (resume service)
└── package-lock.json               # Root Node lock file
```

---

## Quick Start (TL;DR)

If you just want to get running fast:

```powershell
# 1. Extract resume_service.zip if not already done
Expand-Archive -Path resume_service.zip -DestinationPath . -Force

# 2. Install all dependencies
cd frontend/portal && npm install && cd ../..
cd frontend/candidatePages && npm install && cd ../..
cd resume_service && pip install -e . && cd ..

# 3. Set up Supabase (run schema.sql + seed.sql in SQL Editor)

# 4. Configure .env files (see Step 2 below)

# 5. Start everything
.\start-all.ps1
```

**Access URLs:**
- Portal (Recruiter/Admin): http://localhost:3001
- Candidate Portal: http://localhost:3000
- Candidate API Proxy: http://localhost:3002
- Resume Service: http://localhost:8000

---

## Step-by-Step Setup

### 1. Supabase Database Setup

This platform uses **Supabase** as its PostgreSQL backend. You need a Supabase project for full functionality.

1. Go to [https://supabase.com](https://supabase.com) and create a new project (free tier is fine)
2. Wait for the database to provision (~2 minutes)
3. Navigate to **SQL Editor** in your Supabase dashboard
4. **Run the schema migration:**
   - Open `database/schema.sql`
   - Copy its entire contents
   - Paste into Supabase SQL Editor → Click **Run**
5. **Run the seed data:**
   - Open `database/seed.sql`
   - Copy its entire contents
   - Paste into Supabase SQL Editor → Click **Run**
6. **Get your API credentials:**
   - Go to **Project Settings → API**
   - Copy **Project URL** → this is your `SUPABASE_URL`
   - Copy **service_role** secret → this is your `SUPABASE_SERVICE_ROLE_KEY`

> **Note:** If you run `seed.sql` multiple times and get duplicate key errors, run `database/cleanup_duplicates.sql` to clean up.

### 2. Environment Variables

#### Portal Backend (`frontend/portal/.env`)

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=change-this-to-a-strong-random-string
PORT=3001
NODE_ENV=development
```

#### Candidate Pages (`frontend/candidatePages/.env`)

```env
PORTAL_API_URL=http://localhost:3001/api/v1
RESUME_SERVICE_URL=http://localhost:8000/v1
PORT=3002
```

#### Candidate Pages Local (`frontend/candidatePages/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

> **Without Supabase:** Leave `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` unset. The Portal backend falls back to CSV mode, but most endpoints return `SERVICE_UNAVAILABLE`. Use Supabase for full functionality.

### 3. Install Dependencies

```powershell
# Portal (Vite + React)
cd frontend/portal
npm install

# Candidate Pages (Next.js)
cd ../candidatePages
npm install

# Resume Service (Python)
cd ../../resume_service
pip install -e .
```

### 4. Start All Services

You need **3-4 terminal windows** running simultaneously.

#### Option A: Use the startup script (Recommended)

```powershell
.\start-all.ps1
```

This script:
1. Kills existing processes on ports 3001, 3002, 3003
2. Starts Portal Server (port 3001)
3. Starts Candidate Pages Server (port 3002)

#### Option B: Manual start (4 terminals)

**Terminal 1 — Resume Service (Python):**
```powershell
cd resume_service
uvicorn resume_service.main:app --reload --port 8000
```

**Terminal 2 — Portal Backend (Express):**
```powershell
cd frontend/portal
npm run dev
```

**Terminal 3 — Candidate Pages UI (Next.js):**
```powershell
cd frontend/candidatePages
npm run dev
```

**Terminal 4 — Candidate API Proxy (Express):**
```powershell
cd frontend/candidatePages
npm run dev:api
```

> **Note:** If `npm run dev:api` is not defined, the candidate `server.ts` may start alongside the Next.js dev server. Check `package.json` scripts for exact commands.

### 5. Verify Setup

Open these URLs in your browser. All should return `{"status": "ok"}`:

- **Portal Health:** http://localhost:3001/api/v1/health
- **Candidate API Health:** http://localhost:3002/api/v1/health
- **Resume Service Health:** http://localhost:8000/health

---

## Default Login Credentials

After running `seed.sql`:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | `admin@coastalseven.com` | `admin123` | Full platform access, user management |
| **Recruiter** | `recruiter@coastalseven.com` | `recruiter123` | Jobs, applications, interviews |
| **Candidate** | `candidate@example.com` | `candidate123` | Browse jobs, apply, bookmarks |

> **IMPORTANT:** Change these passwords before any production deployment.

---

## How to Run (Multiple Options)

### Single-Command Start

```powershell
.\start-all.ps1
```

Starts all servers in separate PowerShell windows.

### Kill Ports (when you get EADDRINUSE errors)

```powershell
.\kill-ports.ps1
```

Kills processes on ports 3001, 3002, 3003.

### Individual Server Commands

| Server | Command | Port |
|--------|---------|------|
| Resume Service | `cd resume_service && uvicorn resume_service.main:app --reload --port 8000` | 8000 |
| Portal Backend | `cd frontend/portal && npm run dev` | 3001 |
| Candidate UI | `cd frontend/candidatePages && npm run dev` | 3000 |
| Candidate API | `cd frontend/candidatePages && npm run dev:api` | 3002 |

### Run Tests

```powershell
# Resume Service tests
cd resume_service
python -m unittest discover resume_service/tests -v

# Portal/Candidate tests (if available)
cd frontend/portal
npm test
```

---

## API Endpoints

The Portal Backend (port 3001) exposes **35+ REST API endpoints**:

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/register` | Public | Register new candidate |
| POST | `/api/v1/auth/login` | Public | Login (all roles) |
| POST | `/api/v1/auth/refresh` | Authenticated | Refresh JWT token |
| POST | `/api/v1/auth/logout` | Authenticated | Logout, clear tokens |
| GET | `/api/v1/auth/me` | Authenticated | Get current user |

### Jobs

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/jobs` | Public | List jobs (search, filters, pagination) |
| GET | `/api/v1/jobs/:id` | Public | Get single job |
| POST | `/api/v1/jobs` | Recruiter/Admin | Create job |
| PATCH | `/api/v1/jobs/:id` | Recruiter/Admin | Update job |
| DELETE | `/api/v1/jobs/:id` | Recruiter/Admin | Soft delete job |

### Applications

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/applications` | Candidate | Submit application |
| GET | `/api/v1/applications/me` | Candidate | My applications |
| GET | `/api/v1/applications` | Recruiter/Admin | All applications (filterable) |
| GET | `/api/v1/applications/:id` | Recruiter/Admin | Single application |
| PATCH | `/api/v1/applications/:id` | Recruiter/Admin | Update status |

### Bookmarks

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/jobs/:jobId/bookmark` | Candidate | Bookmark job |
| DELETE | `/api/v1/jobs/:jobId/bookmark` | Candidate | Remove bookmark |
| GET | `/api/v1/jobs/bookmarked` | Candidate | List bookmarked jobs |

### Interviews

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/interviews` | Recruiter/Admin | Schedule interview |
| PATCH | `/api/v1/interviews/:id` | Recruiter/Admin | Update interview |
| GET | `/api/v1/interviews` | Recruiter/Admin | List interviews |

### Knowledge Factory (Programs)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/programs` | Public | List programs |
| POST | `/api/v1/programs` | Admin | Create program |
| POST | `/api/v1/programs/:id/apply` | Candidate | Apply to program |
| GET | `/api/v1/programs/:id/applications` | Recruiter/Admin | Program applications |

### Users (Admin Only)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/users` | Admin | List users |
| POST | `/api/v1/users` | Admin | Create user |
| PATCH | `/api/v1/users/:id` | Admin | Update user |
| DELETE | `/api/v1/users/:id` | Admin | Soft delete user |

### Other

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/v1/health` | Public | Health check |
| GET | `/api/v1/automations` | Admin | List automations |
| PUT | `/api/v1/automations` | Admin | Update automations |
| POST | `/api/v1/resume/upload` | Candidate | Upload resume (→ port 8000) |
| POST | `/api/v1/matches/compute` | Candidate | Compute matches (→ port 8000) |

---

## Database Schema

The platform uses **11 PostgreSQL tables** with Row Level Security:

| Table | Purpose |
|-------|---------|
| `users` | Unified user table (admin, recruiter, candidate) |
| `candidate_profiles` | Candidate profile data (headline, skills, etc.) |
| `parsed_resumes` | Resume parse results from resume_service |
| `jobs` | Job postings with all fields |
| `applications` | Job applications with 9 status stages |
| `job_matches` | AI match scores between resumes and jobs |
| `job_bookmarks` | Saved jobs by candidates |
| `interviews` | Interview scheduling and feedback |
| `programs` | Knowledge Factory programs |
| `program_applications` | Program applications |
| `activity_logs` | Audit trail |

All tables have `created_at` and `updated_at` columns with automatic triggers.

---

## Features by Phase

### Phase 1: Database + Auth Foundation
- Complete PostgreSQL schema with 11 tables
- Row Level Security policies
- JWT authentication (register, login, refresh, logout)
- Password hashing with bcrypt (12 rounds)
- Role-based access control
- CSV fallback mode for dev without Supabase

### Phase 2: Job Management
- Create jobs with 12+ fields
- Save as draft or post as active
- Job listing with pagination, search, filters
- Close/activate jobs
- Applications page with 9 status stages
- Stats dashboards

### Phase 3: Resume Upload + Matching
- Resume upload (PDF/DOCX, max 5MB)
- Forward to resume_service for parsing
- Match computation against active jobs
- Candidate jobs page with interactive filters
- Match score display

### Phase 4: Application Submission
- Application form with cover letter, portfolio, resume URL
- Submit to shared database
- Success page with real application ID
- Recruiter sees applications immediately

### Phase 5: Candidate Auth + Profile
- Candidate login and registration
- JWT session management
- Header shows auth state
- Protected routes with redirects

### Phase 6: Bookmarks
- Bookmark jobs from jobs page
- Bookmarks page with list
- Apply from bookmarks
- Remove bookmarks

### Phase 7: Interview Scheduling
- Schedule interviews (date, time, type, meeting link)
- Three views: List, Schedule, Feedback
- 5-star rating system
- Auto-updates application status

### Phase 8: Knowledge Factory
- Program listing and selector
- Application form with 7 fields
- File upload with validation (PDF/DOCX, 5MB)
- Success page with next steps

### Phase 9: Search, Filter, Sort
- Debounced search input (300ms)
- Department, type, status filters
- Clear all filters button
- Results count display
- Loading skeletons

### Phase 10: Polish & Testing
- Sonner toast notifications on all actions
- Loading states on buttons
- Empty states with CTAs
- Error handling throughout

---

## Network Access (Other Devices)

To access the platform from other devices on your network (phone, laptop):

1. **Find your machine's IP:**
   ```powershell
   ipconfig
   ```
   Look for IPv4 Address (e.g., `192.168.1.8`)

2. **Update environment files** with your IP instead of `localhost`

3. **Configure Windows Firewall:**
   ```powershell
   New-NetFirewallRule -DisplayName "Next.js Dev" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "Portal Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "Candidate Server" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "Resume Service" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   ```

4. **Access from other device:**
   - Candidate: `http://YOUR_IP:3000`
   - Portal: `http://YOUR_IP:3001`

See `NETWORK_TESTING.md` for the complete guide.

---

## Troubleshooting

### Port Already in Use (EADDRINUSE)

```powershell
.\kill-ports.ps1
```

Or manually:
```powershell
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### Server Not Seeing Live Updates

1. Stop the server (`Ctrl+C`)
2. Run `.\kill-ports.ps1`
3. Restart with `npm run dev`

### 500 Internal Server Error

Check:
- Server console logs for detailed error messages
- Supabase connection is working
- Database tables exist (run `schema.sql`)
- Environment variables are set correctly

### Jobs/Applications Not Loading

Check:
- Supabase has data (run `seed.sql`)
- Server is running on correct port
- CORS is configured correctly
- Browser console for specific error messages

### CSV Fallback Mode Active

If you see `SERVICE_UNAVAILABLE` on most endpoints, you're in CSV mode. Set up Supabase and configure `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env`.

### Duplicate Key Errors After Seeding

Run `database/cleanup_duplicates.sql` in Supabase SQL Editor.

---

## Security Notes

### What's Implemented
- Password hashing with bcrypt (12 rounds)
- JWT tokens with 7-day expiry, 30-day refresh
- Role-based access control (RLS in DB + middleware)
- CORS configured for specific origins
- Soft deletes for audit trail
- PII redaction in resume service (Aadhaar, PAN, passport, religion, caste)

### What Needs Attention Before Production
- **Change all default passwords** in seed data
- **Generate strong JWT_SECRET** (`openssl rand -base64 32`)
- **Add rate limiting** on auth endpoints
- **Enable HTTPS** for all services
- **Add input validation** (zod/joi)
- **Configure CORS** with specific origins (not `*`)
- **Enable database backups**
- **Review Row Level Security policies**

See `SECURITY_FIXES_APPLIED.md` for details on fixed vulnerabilities.

---

## Production Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET
- [ ] Set up HTTPS for all services
- [ ] Configure CORS with specific origins
- [ ] Enable rate limiting on auth endpoints
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure database backups
- [ ] Review Row Level Security policies
- [ ] Add input validation
- [ ] Test all user flows end-to-end
- [ ] Set up CI/CD pipeline
- [ ] Add E2E test suite (Playwright)
- [ ] Configure logging and error tracking

---

## Available Scripts

### PowerShell Scripts

| Script | Purpose |
|--------|---------|
| `start-all.ps1` | Kill ports and start all servers |
| `kill-ports.ps1` | Kill processes on ports 3001-3003 |

### npm Scripts (Portal)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

### npm Scripts (Candidate Pages)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run dev:api` | Start Express API proxy |
| `npm run build` | Build for production |
| `npm run start` | Start production server |

### Python Commands (Resume Service)

| Command | Purpose |
|---------|---------|
| `pip install -e .` | Install dependencies |
| `uvicorn resume_service.main:app --reload --port 8000` | Start dev server |
| `python -m unittest discover resume_service/tests -v` | Run tests |

---

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | This file — complete platform overview |
| `SETUP.md` | Detailed setup guide with troubleshooting |
| `QUICK_START.md` | Quick fixes for common issues |
| `PHASES.md` | Phase-by-phase implementation tracking |
| `IMPLEMENTATION_SUMMARY.md` | Detailed technical implementation docs |
| `BUILD_SUMMARY.md` | Build metrics and progress reports |
| `FINAL_SUMMARY.md` | All 10 phases completion report |
| `SECURITY_FIXES_APPLIED.md` | Security issues found and fixed |
| `NETWORK_TESTING.md` | Network access setup for other devices |
| `SKILL.md` / `SKILL (2).md` | Skill definitions and audit reports |
| `database/schema.sql` | Complete PostgreSQL schema |
| `database/seed.sql` | Initial seed data |
| `database/cleanup_duplicates.sql` | Remove duplicate users |

---

## What Works End-to-End

### Candidate Journey
1. Register account → Login → Browse jobs with filters → Search jobs → View job details → Apply to job → See success page → Bookmark jobs → View bookmarks → Upload resume → See match scores → Apply to Knowledge Factory → Track applications → Logout

### Recruiter Journey
1. Login → Create job with full details → View jobs with filters → Close/activate jobs → View applications → Change application status → Schedule interviews → Add interview feedback → Manage users (admin) → Logout

### Admin Journey
1. Login → View all users → Create/edit/disable users → View all jobs → View all applications → View system metrics → Manage programs → Review program applications

---

## Platform Status

**All 10 Phases Complete** | ~10,000+ lines of code | 35+ API endpoints | 11 database tables

**Build Date:** April 9, 2026
