#!/usr/bin/env python3
"""Test RapidOCR installation and basic functionality."""

import sys

def test_rapidocr():
    """Test if RapidOCR is properly installed and working."""
    print("Testing RapidOCR installation...")
    
    try:
        from rapidocr_onnxruntime import RapidOCR
        print("✓ RapidOCR imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import RapidOCR: {e}")
        return False
    
    try:
        ocr = RapidOCR()
        print("✓ RapidOCR initialized successfully")
    except Exception as e:
        print(f"✗ Failed to initialize RapidOCR: {e}")
        return False
    
    # Test with a simple image (create a blank image)
    try:
        import numpy as np
        from PIL import Image
        
        # Create a simple test image (white background)
        img = np.ones((100, 200, 3), dtype=np.uint8) * 255
        
        result = ocr(img)
        
        # Handle different return formats
        print(f"  Raw result type: {type(result)}")
        print(f"  Raw result: {result}")
        
        if isinstance(result, tuple) and len(result) >= 2:
            result_data, elapse = result[0], result[1]
            print(f"✓ RapidOCR executed successfully")
            if elapse is not None:
                print(f"  Elapsed time: {elapse:.2f}s")
            print(f"  Result data type: {type(result_data)}")
            if result_data:
                print(f"  Found {len(result_data)} text blocks")
        else:
            print(f"✓ RapidOCR executed successfully")
            print(f"  Result: {result}")
        
        print("\n✓ All tests passed! RapidOCR is ready to use.")
        return True
        
    except Exception as e:
        print(f"✗ Failed to run OCR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_rapidocr()
    sys.exit(0 if success else 1)
