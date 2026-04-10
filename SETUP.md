# Platform Setup & Environment Guide

## Architecture Overview

```
Browser
  │
  ├── Candidate Portal (Next.js) → http://localhost:3000
  │     └── API calls → http://localhost:3002/api/v1/*
  │                          │
  │                          ├── Most routes → proxy → Portal (3001)
  │                          └── /resume/upload, /matches/compute → Resume Service (8000)
  │
  ├── Portal (Express) → http://localhost:3001
  │     │
  │     ├── All CRUD operations
  │     ├── Auth (login, register, refresh, logout)
  │     └── Database queries (Supabase)
  │
  └── Resume Service (FastAPI) → http://localhost:8000
        │
        ├── POST /v1/parse ← called by port 3002
        └── POST /v1/score ← called by port 3002
```

## Prerequisites

1. **Node.js** 18+ (https://nodejs.org/)
2. **Python** 3.11+ (https://www.python.org/downloads/)
3. **Supabase** account (https://supabase.com/) - Free tier works
4. **npm** or **yarn**

## Quick Start

### Step 1: Set Up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor in your Supabase dashboard
3. Run the schema migration:
   ```
   Copy contents of: database/schema.sql
   Paste into Supabase SQL Editor → Run
   ```
4. Run the seed data:
   ```
   Copy contents of: database/seed.sql  
   Paste into Supabase SQL Editor → Run
   ```
5. Get your API credentials:
   - Go to Project Settings → API
   - Copy **Project URL** (SUPABASE_URL)
   - Copy **service_role** secret (SUPABASE_SERVICE_ROLE_KEY)

### Step 2: Configure Environment Variables

#### Portal Backend (port 3001)

```powershell
cd D:\Portal\frontend\portal
copy .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
NODE_ENV=development
```

#### Candidate Portal (port 3002)

```powershell
cd D:\Portal\frontend\candidatePages
```

Create `.env`:
```env
PORTAL_API_URL=http://localhost:3001/api/v1
RESUME_SERVICE_URL=http://localhost:8000/v1
PORT=3002
```

### Step 3: Install Dependencies

```powershell
# Portal
cd D:\Portal\frontend\portal
npm install

# Candidate Portal
cd D:\Portal\frontend\candidatePages
npm install

# Resume Service
cd D:\Portal\resume_service
# Install Python dependencies
pip install -e .
```

### Step 4: Start All Services

Open **4 separate terminal windows**:

**Terminal 1 - Resume Service (Python):**
```powershell
cd D:\Portal\resume_service
uvicorn resume_service.main:app --reload --port 8000
```

**Terminal 2 - Portal Backend (Express):**
```powershell
cd D:\Portal\frontend\portal
npm run dev
```

**Terminal 3 - Candidate Portal (Next.js):**
```powershell
cd D:\Portal\frontend\candidatePages
npm run dev
```

**Terminal 4 - Candidate API Server:**
```powershell
cd D:\Portal\frontend\candidatePages
npm run dev:api
```

### Step 5: Verify Setup

1. **Portal API Health**: http://localhost:3001/api/v1/health
2. **Candidate API Health**: http://localhost:3002/api/v1/health
3. **Resume Service Health**: http://localhost:8000/health

All should return `{"status": "ok"}`

## Default Login Credentials

After running seed.sql:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@coastalseven.com | admin123 |
| Recruiter | recruiter@coastalseven.com | recruiter123 |
| Candidate | candidate@example.com | candidate123 |

**⚠️ IMPORTANT: Change these passwords in production!**

## Development Mode (CSV Fallback)

If you don't have Supabase set up yet, the Portal backend will fall back to CSV mode:

1. Don't set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` in `.env`
2. The server will use CSV files in `frontend/portal/data/` for storage
3. **Limitation**: Many endpoints will return "SERVICE_UNAVAILABLE" in CSV mode
4. **Recommendation**: Use Supabase for full functionality

## Production Deployment

### Environment Variables for Production

```env
# Portal Backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
JWT_SECRET=<generate-a-strong-random-string>
PORT=3001
NODE_ENV=production

# Candidate Portal  
PORTAL_API_URL=https://your-portal-domain.com/api/v1
RESUME_SERVICE_URL=https://your-resume-service.com/v1
PORT=3002

# Resume Service
# (configured via environment or settings.py)
```

### Production Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET (use `openssl rand -base64 32`)
- [ ] Set up HTTPS for all services
- [ ] Configure CORS with specific origins (not `*`)
- [ ] Enable rate limiting on auth endpoints
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Review Row Level Security policies
- [ ] Test all user flows end-to-end

## Troubleshooting

### Portal won't start
- Check that `.env` file exists in `frontend/portal/`
- Verify Node.js version: `node --version` (should be 18+)
- Run `npm install` again

### Database connection errors
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct
- Check that schema.sql has been run in Supabase SQL Editor
- Test connection in Supabase dashboard

### Port already in use
- Portal (3001): `netstat -ano | findstr :3001`
- Candidate (3002): `netstat -ano | findstr :3002`
- Resume Service (8000): `netstat -ano | findstr :8000`
- Kill process: `taskkill /PID <pid> /F`

### CORS errors
- Ensure all services are running on correct ports
- Check CORS configuration in Portal server.ts allows localhost ports

## File Structure

```
D:\Portal\
├── database/
│   ├── schema.sql              # PostgreSQL schema
│   └── seed.sql                # Initial seed data
├── frontend/
│   ├── portal/                 # Recruiter/Admin Portal
│   │   ├── server.ts           # Unified backend (THIS IS THE MAIN BACKEND)
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   └── unified.ts  # Shared types
│   │   │   └── ...
│   │   └── .env
│   ├── candidatePages/         # Candidate Portal
│   │   ├── server.ts           # API proxy + resume/match handlers
│   │   ├── src/
│   │   │   └── ...
│   │   └── .env
│   ├── adminPages/             # Admin Portal (uses portal backend)
│   └── recruitersPage/         # Recruiter Portal (uses portal backend)
└── resume_service/             # Python resume parsing service
    └── ...
```

## API Documentation

See `PORTAL_SCHEMAS.md` in portal directory for complete API contracts.

## Next Steps

After setup is working:
1. Phase 2: Complete job management UI
2. Phase 3: Resume upload flow
3. Phase 4: Application submission
4. Phase 5: Candidate auth & profile
5. Phase 6: Bookmarks
6. Phase 7: Interviews
7. Phase 8: Knowledge Factory
8. Phase 9: Search, filter, sort
9. Phase 10: Polish & testing

Each phase builds on the previous one. Don't skip phases.
