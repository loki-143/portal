#!/bin/bash
# Bash script to start benchmark webapp

echo "============================================================"
echo "Resume Parser Benchmark Webapp"
echo "============================================================"
echo ""

# Check if resume service is running
echo "Checking resume service..."
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "✅ Resume service is running on port 8000"
else
    echo "⚠️  Resume service is NOT running!"
    echo ""
    echo "Please start it in another terminal:"
    echo "  cd resume_service"
    echo "  uvicorn main:app --reload --port 8000"
    echo ""
    echo "Press Enter to continue anyway or Ctrl+C to exit..."
    read
fi

echo ""
echo "Starting benchmark webapp server..."
echo ""

# Start Python server
python3 server.py
