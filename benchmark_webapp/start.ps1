# PowerShell script to start benchmark webapp
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "=" * 59 -ForegroundColor Cyan
Write-Host "Resume Parser Benchmark Webapp" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "=" * 59 -ForegroundColor Cyan
Write-Host ""

# Check if resume service is running
Write-Host "Checking resume service..." -ForegroundColor Cyan
$resumeServiceRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $resumeServiceRunning = $true
    }
} catch {
    $resumeServiceRunning = $false
}

if ($resumeServiceRunning) {
    Write-Host "✅ Resume service is running on port 8000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Resume service is NOT running!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please start it in another terminal:" -ForegroundColor Yellow
    Write-Host "  cd resume_service" -ForegroundColor White
    Write-Host "  uvicorn main:app --reload --port 8000" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Enter to continue anyway or Ctrl+C to exit..." -ForegroundColor Yellow
    Read-Host
}

Write-Host ""
Write-Host "Starting benchmark webapp server..." -ForegroundColor Cyan
Write-Host ""

# Start Python server
python server.py
