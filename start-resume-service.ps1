# PowerShell script to start resume service
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "=" * 59 -ForegroundColor Cyan
Write-Host "Resume Service - PyMuPDF + PaddleOCR" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host "=" * 59 -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "resume_service")) {
    Write-Host "❌ Error: resume_service directory not found" -ForegroundColor Red
    Write-Host "   Please run this script from the project root directory" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Cyan
try {
    python -c "import fitz; from paddleocr import PaddleOCR" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed" -ForegroundColor Green
    } else {
        throw "Dependencies not found"
    }
} catch {
    Write-Host "⚠️  Dependencies not installed!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install dependencies:" -ForegroundColor Yellow
    Write-Host "  pip install -e ." -ForegroundColor White
    Write-Host ""
    Write-Host "Press Enter to continue anyway or Ctrl+C to exit..." -ForegroundColor Yellow
    Read-Host
}

Write-Host ""
Write-Host "Starting resume service on port 8000..." -ForegroundColor Cyan
Write-Host ""
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health Check: http://localhost:8000/health" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start uvicorn from project root (not from inside resume_service)
uvicorn resume_service.main:app --reload --port 8000 --host 0.0.0.0
