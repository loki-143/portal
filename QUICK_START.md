# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies (1 minute)

```bash
pip install -e .
```

Verify:
```bash
python -c "import fitz; from paddleocr import PaddleOCR; print('✅ Ready!')"
```

### Step 2: Start Resume Service (30 seconds)

```bash
cd resume_service
uvicorn main:app --reload --port 8000
```

Keep this terminal running.

### Step 3: Start Benchmark Webapp (30 seconds)

Open a new terminal:

```bash
cd benchmark_webapp
python server.py
```

## 🌐 Open in Browser

```
http://localhost:3003/index.html
```

## 📤 Upload & Test

1. Drag & drop your PDF files
2. See extraction results instantly
3. Compare multiple PDFs

## 📊 What You'll See

- **Processing Time** - How fast (0.2-5 seconds)
- **Extractor Used** - PyMuPDF (fast) or PaddleOCR (OCR)
- **Full Text** - Complete extracted text
- **Metadata** - All extraction details
- **Comparison** - Side-by-side metrics

## 🎯 Expected Results

### Text-Based PDF
- 🟢 PyMuPDF (green badge)
- ⚡ 0.2-0.5 seconds
- ✅ Full text extracted

### Scanned PDF
- 🔵 PaddleOCR (blue badge)
- ⏱️ 2-5 seconds
- ✅ OCR text extracted

## 📚 Documentation

- `PYMUPDF_PADDLEOCR_INTEGRATION.md` - Complete integration guide
- `BENCHMARK_WEBAPP_GUIDE.md` - Webapp usage guide
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full overview

## 🆘 Troubleshooting

### "Failed to process" error
→ Make sure resume service is running on port 8000

### Slow processing
→ Normal for scanned PDFs (2-5 seconds)
→ Enable GPU for faster OCR (see docs)

### No text extracted
→ Check if PDF is corrupted or password-protected

## 🎉 That's It!

You're ready to test PyMuPDF + PaddleOCR with your own PDFs!

Upload some resumes and see the magic happen. 🚀
