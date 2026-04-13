#!/usr/bin/env python3
"""Test script for PyMuPDF + PaddleOCR integration."""

import sys
from pathlib import Path

# Add resume_service to path
sys.path.insert(0, str(Path(__file__).parent))

from resume_service.extractors.pdf import extract_pdf


def test_pymupdf():
    """Test PyMuPDF + PaddleOCR with a sample PDF."""
    print("=" * 60)
    print("PyMuPDF + PaddleOCR Integration Test")
    print("=" * 60)
    print()
    
    # Check if sample PDF exists
    sample_pdf = Path("A22126511005_BankuruGanesh.pdf")
    
    if not sample_pdf.exists():
        print("❌ Sample PDF not found: A22126511005_BankuruGanesh.pdf")
        print("   Please provide a test PDF file")
        return False
    
    print(f"Testing with: {sample_pdf.name}")
    print()
    
    try:
        # Read PDF
        with open(sample_pdf, "rb") as f:
            pdf_bytes = f.read()
        
        print("Extracting text...")
        result = extract_pdf(pdf_bytes)
        
        print()
        print("=" * 60)
        print("RESULTS")
        print("=" * 60)
        print(f"Extractor used: {result.metadata.get('extractor_name', 'unknown')}")
        print(f"Page count: {result.metadata.get('page_count', 0)}")
        print(f"Detected columns: {result.detected_columns}")
        
        # PyMuPDF specific
        if result.metadata.get('extractor_name') == 'pymupdf':
            print(f"Has images: {result.metadata.get('has_images', False)}")
            print(f"Text length: {result.metadata.get('text_length', 0)}")
        
        # PaddleOCR specific
        if result.metadata.get('extractor_name') == 'paddleocr':
            print(f"OCR used: {result.metadata.get('ocr_used', False)}")
        
        print()
        print(f"Total text length: {len(result.text)} characters")
        print(f"Line count: {len(result.lines)} lines")
        print()
        
        # Show first 500 characters
        print("First 500 characters:")
        print("-" * 60)
        print(result.text[:500])
        print("-" * 60)
        print()
        
        # Check which extractor was used
        extractor = result.metadata.get('extractor_name', 'unknown')
        if extractor == 'pymupdf':
            print("✅ SUCCESS: PyMuPDF is working!")
            print("   Fast text extraction from PDF")
        elif extractor == 'paddleocr':
            print("✅ SUCCESS: PaddleOCR is working!")
            print("   OCR extraction from image-based PDF")
        elif extractor == 'custom-pdf':
            print("⚠️  WARNING: Using custom parser fallback")
            print("   PyMuPDF may not be installed correctly")
        else:
            print("❌ ERROR: Unknown extractor")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_pymupdf()
    sys.exit(0 if success else 1)
