#!/bin/bash
# Bash script to start resume service

echo "============================================================"
echo "Resume Service - PyMuPDF + PaddleOCR"
echo "============================================================"
echo ""

# Check if we're in the right directory
if [ ! -d "resume_service" ]; then
    echo "❌ Error: resume_service directory not found"
    echo "   Please run this script from the project root directory"
    echo ""
    exit 1
fi

# Check if dependencies are installed
echo "Checking dependencies..."
if python3 -c "import fitz; from paddleocr import PaddleOCR" 2>/dev/null; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed!"
    echo ""
    echo "Please install dependencies:"
    echo "  pip install -e ."
    echo ""
    echo "Press Enter to continue anyway or Ctrl+C to exit..."
    read
fi

echo ""
echo "Starting resume service on port 8000..."
echo ""
echo "API Documentation: http://localhost:8000/docs"
echo "Health Check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start uvicorn from project root (not from inside resume_service)
uvicorn resume_service.main:app --reload --port 8000 --host 0.0.0.0
