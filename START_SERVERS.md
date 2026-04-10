# How to Start All Servers

This application requires 3 servers to run simultaneously:

## 1. Portal Backend (Port 3001)
```bash
cd frontend/portal
npm run dev
```

## 2. Candidate Pages Backend API (Port 3002)
```bash
cd frontend/candidatePages
npm run dev:api
```

## 3. Candidate Pages Frontend (Port 3000)
```bash
cd frontend/candidatePages
npm run dev
```

## Quick Start (Windows PowerShell)

Open 3 separate terminal windows and run each command:

**Terminal 1:**
```powershell
cd frontend/portal; npm run dev
```

**Terminal 2:**
```powershell
cd frontend/candidatePages; npm run dev:api
```

**Terminal 3:**
```powershell
cd frontend/candidatePages; npm run dev
```

## Verify Servers are Running

- Portal Backend: http://localhost:3001/api/v1/health
- Candidate Backend: http://localhost:3002/api/v1/health
- Candidate Frontend: http://localhost:3000

## Common Issues

### "Failed to load resume" error
- Make sure the Candidate Pages Backend API (port 3002) is running
- Run: `cd frontend/candidatePages && npm run dev:api`

### "Backend service unavailable" error
- Make sure the Portal Backend (port 3001) is running
- Run: `cd frontend/portal && npm run dev`

### Port already in use
- Kill the process using that port or change the PORT in .env file
