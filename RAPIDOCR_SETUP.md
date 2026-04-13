# RapidOCR Setup Guide

## What Changed

Switched from PaddleOCR to RapidOCR for better compatibility and reliability.

## Why RapidOCR?

✅ **No compatibility issues** - Uses ONNX runtime, no PaddlePaddle conflicts  
✅ **Fast** - Optimized for speed  
✅ **No external dependencies** - No need to install Tesseract  
✅ **Lightweight** - Smaller package size  
✅ **Good accuracy** - Comparable to PaddleOCR for English text  
✅ **Works offline** - All models included  

## Installation

```bash
# Uninstall PaddleOCR (if installed)
pip uninstall paddleocr paddlepaddle paddlepaddle-gpu -y

# Install dependencies
pip install -e .
```

This installs:
- `pymupdf` - PDF parsing
- `rapidocr-onnxruntime` - OCR engine
- `Pillow` - Image processing
- `numpy` - Array operations

## How It Works

```
1. PyMuPDF tries to extract text
   ├─ If text found → Return (fast, 0.2-0.5s)
   └─ If no text but has images → Try RapidOCR

2. RapidOCR processes images
   ├─ Convert PDF pages to images
   ├─ Run OCR on each page
   └─ Return extracted text (1-3s per page)

3. Fallback to custom parser (rare)
```

## Testing

```powershell
# 1. Install
pip install -e .

# 2. Start service
uvicorn resume_service.main:app --reload --port 8000

# 3. Start benchmark webapp
cd benchmark_webapp
python server.py

# 4. Open browser
http://localhost:3003/index.html

# 5. Upload your PDF
```

## Expected Results

### Text-based PDF
- Extractor: `pymupdf`
- Time: 0.2-0.5 seconds
- ✅ Fast and accurate

### Image-based PDF
- Extractor: `rapidocr`
- Time: 1-3 seconds per page
- ✅ OCR extraction works

## Advantages Over PaddleOCR

| Feature | RapidOCR | PaddleOCR |
|---------|----------|-----------|
| Installation | ✅ Simple | ❌ Complex |
| Dependencies | ✅ Minimal | ❌ Many |
| Compatibility | ✅ No issues | ❌ Version conflicts |
| Speed | ✅ Fast | ✅ Fast |
| Accuracy | ✅ Good | ✅ Excellent |
| Size | ✅ Small (~50MB) | ❌ Large (~500MB) |
| Offline | ✅ Yes | ✅ Yes |

## Troubleshooting

### "rapidocr not found"
```bash
pip install rapidocr-onnxruntime
```

### Still getting errors
```bash
# Clean install
pip uninstall paddleocr paddlepaddle -y
pip install -e . --force-reinstall
```

### OCR not working
- Check if PDF actually has images
- Try with a known scanned PDF
- Check console logs for errors

## Next Steps

1. Uninstall PaddleOCR
2. Install RapidOCR
3. Restart service
4. Test with your PDFs

Ready to go! 🚀
