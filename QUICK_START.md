# Quick Start Guide

## Problem: Port Already in Use (EADDRINUSE)

If you see this error:
```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3001
```

### Solution 1: Use the Kill Ports Script
```powershell
.\kill-ports.ps1
```

### Solution 2: Manual Kill
```powershell
# Find and kill process on port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# Find and kill process on port 3002
Get-NetTCPConnection -LocalPort 3002 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

---

## Starting All Servers

### Option 1: Use the Startup Script (Recommended)
```powershell
.\start-all.ps1
```

This will:
1. Kill any existing processes on ports 3001, 3002, 3003
2. Start Portal Server (port 3001)
3. Start Candidate Pages Server (port 3002)

### Option 2: Manual Start

**Terminal 1 - Portal Server:**
```powershell
cd frontend/portal
npm run dev
```

**Terminal 2 - Candidate Pages Server:**
```powershell
cd frontend/candidatePages
npm run dev
```

---

## Accessing the Application

- **Portal (Recruiter/Admin):** http://localhost:3001
- **Candidate Pages:** http://localhost:3002

### Test Accounts

**Admin:**
- Email: `admin@coastalseven.com`
- Password: `admin123`

**Recruiter:**
- Email: `recruiter@coastalseven.com`
- Password: `recruiter123`

**Candidate:**
- Email: `candidate@example.com`
- Password: `candidate123`

---

## Database Setup

### First Time Setup

1. Run the schema in Supabase SQL Editor:
```sql
-- Run: database/schema.sql
```

2. Run the seed data:
```sql
-- Run: database/seed.sql
```

### If You Have Duplicate Key Errors

Run the cleanup script in Supabase SQL Editor:
```sql
-- Run: database/cleanup_duplicates.sql
```

---

## Environment Variables

### Portal Server (.env in frontend/portal/)
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_strong_secret_here
NODE_ENV=development
```

### Candidate Pages (.env.local in frontend/candidatePages/)
```env
PORT=3002
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
PORTAL_API_URL=http://localhost:3001/api/v1
RESUME_SERVICE_URL=http://localhost:8000/v1
```

---

## Troubleshooting

### Server Not Seeing Live Updates

**Problem:** Changes to server.ts files don't reflect immediately.

**Solution:** 
1. Stop the server (Ctrl+C)
2. Run `.\kill-ports.ps1` to ensure clean shutdown
3. Restart with `npm run dev`

### 500 Internal Server Error

**Check:**
1. Server console logs for detailed error messages
2. Supabase connection is working
3. Database tables exist (run schema.sql)
4. Environment variables are set correctly

### Jobs/Applications Not Loading

**Check:**
1. Supabase has data (run seed.sql)
2. Server is running on correct port
3. CORS is configured correctly
4. Browser console for specific error messages

---

## Development Tips

1. **Always check server logs** - Error details are logged server-side
2. **Use the kill-ports script** before starting servers
3. **Restart servers** after changing server.ts files
4. **Check Supabase logs** for database-related issues
5. **Clear browser cache** if seeing stale data

---

## Recent Fixes Applied

✅ Fixed broken database joins (applications → candidate_profiles)
✅ Added missing automations endpoint
✅ Fixed jobs page undefined error
✅ Added proper error handling
✅ Created database cleanup script

See `SECURITY_FIXES_APPLIED.md` for details.
