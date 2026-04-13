# Setup RapidOCR for Resume Service
# This script removes PaddleOCR and installs RapidOCR

Write-Host "=== Setting up RapidOCR ===" -ForegroundColor Cyan

# Step 1: Uninstall PaddleOCR and related packages
Write-Host "`n[1/3] Removing PaddleOCR..." -ForegroundColor Yellow
pip uninstall paddleocr paddlepaddle paddlepaddle-gpu -y

# Step 2: Install dependencies from pyproject.toml
Write-Host "`n[2/3] Installing RapidOCR and dependencies..." -ForegroundColor Yellow
pip install -e .

# Step 3: Verify installation
Write-Host "`n[3/3] Verifying installation..." -ForegroundColor Yellow
python -c "from rapidocr_onnxruntime import RapidOCR; print('RapidOCR installed successfully!')"

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "You can now start the resume service with:" -ForegroundColor Cyan
Write-Host "  uvicorn resume_service.main:app --reload --port 8000" -ForegroundColor White
