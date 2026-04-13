#!/bin/bash
# Setup RapidOCR for Resume Service
# This script removes PaddleOCR and installs RapidOCR

echo "=== Setting up RapidOCR ==="

# Step 1: Uninstall PaddleOCR and related packages
echo -e "\n[1/3] Removing PaddleOCR..."
pip uninstall paddleocr paddlepaddle paddlepaddle-gpu -y

# Step 2: Install dependencies from pyproject.toml
echo -e "\n[2/3] Installing RapidOCR and dependencies..."
pip install -e .

# Step 3: Verify installation
echo -e "\n[3/3] Verifying installation..."
python -c "from rapidocr_onnxruntime import RapidOCR; print('RapidOCR installed successfully!')"

echo -e "\n=== Setup Complete ==="
echo "You can now start the resume service with:"
echo "  uvicorn resume_service.main:app --reload --port 8000"
