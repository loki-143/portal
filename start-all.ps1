# Start all servers for the Unified Hiring Platform
# This script kills existing processes and starts fresh servers

Write-Host "=== Unified Hiring Platform Startup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill existing processes
Write-Host "Step 1: Cleaning up existing processes..." -ForegroundColor Yellow
& "$PSScriptRoot\kill-ports.ps1"
Write-Host ""

# Step 2: Start Portal Server (port 3001)
Write-Host "Step 2: Starting Portal Server (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend\portal'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

# Step 3: Start Candidate Pages UI (Next.js - port 3000)
Write-Host "Step 3: Starting Candidate Pages UI (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend\candidatePages'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

# Step 4: Start Candidate API Proxy (port 3002)
Write-Host "Step 4: Starting Candidate API Proxy (port 3002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend\candidatePages'; npm run dev:api" -WindowStyle Normal
Start-Sleep -Seconds 2

# Step 5: Start Resume Service (port 8000)
Write-Host "Step 5: Starting Resume Service (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\resume_service'; python -m uvicorn resume_service.main:app --reload --port 8000" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=== All servers started! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Portal (Recruiter/Admin): http://localhost:3001" -ForegroundColor Cyan
Write-Host "Candidate Pages UI:       http://localhost:3000" -ForegroundColor Cyan
Write-Host "Candidate API Proxy:      http://localhost:3002" -ForegroundColor Cyan
Write-Host "Resume Service:           http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
