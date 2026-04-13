# Resume Parser Benchmark Webapp

Interactive web interface to test PyMuPDF + PaddleOCR resume parsing with your own PDFs.

## Features

- 📤 **Drag & Drop Upload** - Drop multiple PDFs or click to browse
- ⚡ **Real-time Processing** - See extraction results instantly
- 📊 **Detailed Metrics** - Processing time, character count, line count, columns detected
- 🔍 **Full Text View** - View complete extracted text and lines
- 📋 **Metadata Display** - See all extraction metadata (extractor used, page count, etc.)
- 📈 **Comparison Table** - Compare multiple PDFs side-by-side
- 🎨 **Beautiful UI** - Modern, responsive design

## Quick Start

### 1. Start Resume Service

```bash
cd resume_service
uvicorn main:app --reload --port 8000
```

### 2. Start Benchmark Webapp

```bash
cd benchmark_webapp
python server.py
```

### 3. Open in Browser

```
http://localhost:3003/index.html
```

## Usage

1. **Upload PDFs**
   - Drag and drop PDF files onto the upload area
   - Or click to browse and select files
   - Supports multiple files (max 10MB each)

2. **View Results**
   - Each PDF gets its own result card
   - See processing time, extractor used, and metrics
   - Expand sections to view full extracted text

3. **Compare Results**
   - Upload multiple PDFs to see comparison table
   - Compare processing times and extraction quality
   - Identify which extractor was used for each PDF

## What You'll See

### Metrics Displayed

- **Processing Time** - How long extraction took (seconds)
- **Extractor Used** - PyMuPDF (text), PaddleOCR (OCR), or Custom (fallback)
- **Characters** - Total characters extracted
- **Lines** - Number of lines detected
- **File Size** - Original PDF file size
- **Columns Detected** - Multi-column layout detection (1 or 2)

### Metadata

- `extractor_name` - Which parser was used
- `page_count` - Number of pages in PDF
- `has_images` - Whether PDF contains images (PyMuPDF only)
- `text_length` - Character count (PyMuPDF only)
- `ocr_used` - Whether OCR was used (PaddleOCR only)
- `detected_columns` - Column layout detection

### Extractor Badges

- 🟢 **PyMuPDF** (Green) - Fast text extraction from text-based PDFs
- 🔵 **PaddleOCR** (Blue) - OCR extraction from image-based PDFs
- 🟡 **Custom** (Orange) - Fallback parser (rare)

## Testing Scenarios

### Test 1: Text-Based Resume
Upload a standard resume with text (not scanned).

**Expected:**
- Extractor: PyMuPDF (green badge)
- Processing time: 0.2-0.5 seconds
- Full text extracted
- Columns detected if multi-column layout

### Test 2: Scanned/Image Resume
Upload a scanned resume or image-based PDF.

**Expected:**
- Extractor: PaddleOCR (blue badge)
- Processing time: 2-5 seconds (CPU) or 0.5-1 second (GPU)
- OCR text extracted
- May take longer but more accurate

### Test 3: Multi-Column Resume
Upload a resume with 2-column layout.

**Expected:**
- Columns detected: 2
- Text properly extracted with layout preserved
- PyMuPDF handles this well

### Test 4: Complex Resume with Tables
Upload a resume with tables, charts, or complex formatting.

**Expected:**
- PyMuPDF extracts text with structure
- Tables may be preserved
- Check metadata for `has_tables` (if available)

## Troubleshooting

### "Failed to process" Error

**Cause:** Resume service not running or wrong port

**Solution:**
```bash
cd resume_service
uvicorn main:app --reload --port 8000
```

### CORS Error

**Cause:** Browser blocking cross-origin requests

**Solution:** Use the provided `server.py` which handles CORS:
```bash
python server.py
```

### Slow Processing

**Cause:** Image-based PDF using OCR

**Solution:** 
- This is normal for scanned PDFs (2-5 seconds)
- Enable GPU for faster OCR (see main documentation)
- Text-based PDFs should be fast (0.2-0.5 seconds)

### No Text Extracted

**Possible causes:**
1. PDF is corrupted
2. PDF is password-protected
3. PDF contains only images without text layer

**Check:**
- Metadata shows which extractor was used
- Try opening PDF in another viewer to verify it's valid

## Architecture

```
Browser (localhost:3003)
    ↓ Upload PDF
Resume Service (localhost:8000)
    ↓ Process with PyMuPDF/PaddleOCR
    ↓ Return JSON result
Browser
    ↓ Display results
```

## API Endpoint Used

```
POST http://localhost:8000/api/v1/parse
Content-Type: multipart/form-data

Body: file (PDF)

Response:
{
  "text": "extracted text...",
  "lines": ["line 1", "line 2", ...],
  "detected_columns": 2,
  "metadata": {
    "extractor_name": "pymupdf",
    "page_count": 2,
    "has_images": false,
    "text_length": 2450
  }
}
```

## Tips for Testing

1. **Test Different PDF Types**
   - Standard text resumes
   - Scanned documents
   - Multi-column layouts
   - Resumes with tables
   - Image-heavy resumes

2. **Compare Extractors**
   - Upload same resume in different formats
   - Compare PyMuPDF vs PaddleOCR results
   - Check processing times

3. **Check Accuracy**
   - Verify extracted text matches original
   - Check if tables are preserved
   - Verify multi-column layout handling

4. **Performance Testing**
   - Upload multiple PDFs at once
   - Check processing times
   - Monitor which extractor is used most

## Expected Results

### Good Performance
- Text PDFs: 0.2-0.5 seconds (PyMuPDF)
- Image PDFs: 2-5 seconds (PaddleOCR)
- 80-90% use PyMuPDF (fast)
- 10-15% use PaddleOCR (accurate)
- <5% use custom parser (rare)

### Quality Indicators
- Full text extracted
- Proper line breaks
- Tables preserved (if present)
- Multi-column layout detected
- Metadata complete

## Files

- `index.html` - Main webapp interface
- `server.py` - Simple HTTP server with CORS
- `README.md` - This file

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with JavaScript enabled

## Notes

- Max file size: 10MB per PDF
- Supports multiple file upload
- Results persist until page refresh
- No data is stored on server
- All processing happens in resume_service

## Next Steps

After testing:
1. Review extraction quality
2. Check processing times
3. Identify any issues
4. Adjust resume_service configuration if needed
5. Deploy to production

Enjoy testing! 🚀
