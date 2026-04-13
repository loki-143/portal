# Benchmark Webapp Guide

## Overview

Interactive web interface to test PyMuPDF + PaddleOCR resume parsing with your own PDFs in real-time.

## Quick Start (3 Steps)

### Step 1: Start Resume Service

```bash
cd resume_service
uvicorn main:app --reload --port 8000
```

Keep this terminal running.

### Step 2: Start Benchmark Webapp

Open a new terminal:

**Windows (PowerShell):**
```powershell
cd benchmark_webapp
.\start.ps1
```

**Linux/Mac:**
```bash
cd benchmark_webapp
chmod +x start.sh
./start.sh
```

**Or manually:**
```bash
cd benchmark_webapp
python server.py
```

### Step 3: Open in Browser

```
http://localhost:3003/index.html
```

## What You'll See

### Main Interface

1. **Upload Area** (Top)
   - Drag & drop PDFs here
   - Or click to browse files
   - Supports multiple files

2. **Result Cards** (Middle)
   - One card per uploaded PDF
   - Shows all extraction details
   - Expandable sections

3. **Comparison Table** (Bottom)
   - Appears when you upload 2+ PDFs
   - Side-by-side comparison
   - Easy to spot differences

## Features

### 📊 Metrics Displayed

Each result card shows:

- **Processing Time** - How fast extraction was (seconds)
- **Extractor Used** - Which parser handled the PDF
  - 🟢 PyMuPDF (green) - Text-based PDF, fast
  - 🔵 PaddleOCR (blue) - Image-based PDF, OCR
  - 🟡 Custom (orange) - Fallback parser
- **Characters** - Total characters extracted
- **Lines** - Number of lines detected
- **File Size** - Original PDF size
- **Columns Detected** - Multi-column layout (1 or 2)

### 📋 Metadata Section

Shows technical details:
- `extractor_name` - Parser used
- `page_count` - Number of pages
- `has_images` - Contains images? (PyMuPDF)
- `text_length` - Character count (PyMuPDF)
- `ocr_used` - OCR was used? (PaddleOCR)

### 📝 Extracted Text

- Full text extracted from PDF
- Expandable/collapsible
- Preserves formatting
- Scrollable for long text

### 📄 Lines View

- Individual lines extracted
- Shows line-by-line breakdown
- Useful for debugging

## Testing Scenarios

### Scenario 1: Standard Text Resume

**Upload:** Regular resume (Word → PDF, not scanned)

**Expected Results:**
- Extractor: 🟢 PyMuPDF
- Time: 0.2-0.5 seconds
- Full text extracted
- All sections visible

**What to Check:**
- Is all text extracted?
- Are line breaks correct?
- Is formatting preserved?

### Scenario 2: Scanned Resume

**Upload:** Scanned document or image-based PDF

**Expected Results:**
- Extractor: 🔵 PaddleOCR
- Time: 2-5 seconds (CPU) or 0.5-1s (GPU)
- OCR text extracted
- `ocr_used: true` in metadata

**What to Check:**
- Is text accurately recognized?
- Are there OCR errors?
- Is quality acceptable?

### Scenario 3: Multi-Column Resume

**Upload:** Resume with 2-column layout

**Expected Results:**
- Extractor: 🟢 PyMuPDF
- Columns detected: 2
- Text properly ordered
- Layout preserved

**What to Check:**
- Are columns detected correctly?
- Is text order correct (not mixed)?
- Is layout preserved?

### Scenario 4: Resume with Tables

**Upload:** Resume with tables, charts, or complex formatting

**Expected Results:**
- Extractor: 🟢 PyMuPDF
- Tables extracted
- Structure preserved

**What to Check:**
- Are tables readable?
- Is structure maintained?
- Are all cells extracted?

### Scenario 5: Multiple PDFs Comparison

**Upload:** 3-5 different resumes

**Expected Results:**
- Comparison table appears
- Side-by-side metrics
- Easy to compare

**What to Check:**
- Which extractor is used most?
- Are processing times consistent?
- Which PDFs extract best?

## Understanding Results

### Good Extraction

✅ Extractor: PyMuPDF (fast)  
✅ Time: < 1 second  
✅ All text extracted  
✅ Proper formatting  
✅ Columns detected correctly  

### OCR Extraction

🔵 Extractor: PaddleOCR  
⏱️ Time: 2-5 seconds (normal)  
✅ Text recognized accurately  
⚠️ May have minor OCR errors  
ℹ️ Slower but handles scanned docs  

### Poor Extraction

❌ Very little text extracted  
❌ Garbled or mixed text  
❌ Wrong column order  
❌ Missing sections  

**Possible causes:**
- PDF is corrupted
- PDF is password-protected
- PDF has unusual encoding
- Complex layout not handled

## Performance Benchmarks

### Expected Performance

| PDF Type | Extractor | Time | Quality |
|----------|-----------|------|---------|
| Text-based | PyMuPDF | 0.2-0.5s | Excellent |
| Scanned (CPU) | PaddleOCR | 2-5s | Excellent |
| Scanned (GPU) | PaddleOCR | 0.5-1s | Excellent |
| Complex layout | PyMuPDF | 0.3-0.7s | Good |

### Distribution

In production, expect:
- 80-90% PyMuPDF (text-based, fast)
- 10-15% PaddleOCR (scanned, accurate)
- <5% Custom parser (fallback, rare)

## Troubleshooting

### Error: "Failed to process"

**Cause:** Resume service not running

**Solution:**
```bash
cd resume_service
uvicorn main:app --reload --port 8000
```

### Error: CORS / Network Error

**Cause:** Not using provided server

**Solution:** Use `server.py`:
```bash
cd benchmark_webapp
python server.py
```

### Slow Processing (>10 seconds)

**Cause:** Large image-based PDF with OCR

**Solutions:**
1. Enable GPU for PaddleOCR (see main docs)
2. Reduce PDF resolution before upload
3. This is normal for very large scanned docs

### No Text Extracted

**Possible causes:**
1. PDF is corrupted - Try opening in PDF viewer
2. PDF is password-protected - Remove password first
3. PDF contains only images - OCR should handle this
4. PDF has unusual encoding - Check with different PDF

**Debug steps:**
1. Check metadata - which extractor was used?
2. Check file size - is it reasonable?
3. Try different PDF to isolate issue
4. Check resume_service logs for errors

### Text is Garbled

**Cause:** Encoding issues or complex PDF structure

**Solutions:**
1. Try re-saving PDF from original source
2. Use "Print to PDF" to create clean version
3. Check if original PDF opens correctly
4. May need custom handling for specific PDF type

## Tips for Best Results

### For Uploading

1. **Use Clean PDFs**
   - Export from Word/Google Docs
   - Avoid scanned copies if possible
   - Use standard fonts

2. **Optimize File Size**
   - Keep under 5MB for fast processing
   - Compress images if needed
   - Remove unnecessary pages

3. **Test Multiple Formats**
   - Upload same resume in different formats
   - Compare text vs scanned versions
   - Check which works best

### For Testing

1. **Start Simple**
   - Test with 1-2 PDFs first
   - Verify basic functionality
   - Then test edge cases

2. **Compare Results**
   - Upload multiple PDFs
   - Use comparison table
   - Identify patterns

3. **Check Accuracy**
   - Read extracted text carefully
   - Compare with original PDF
   - Note any missing sections

4. **Monitor Performance**
   - Track processing times
   - Note which extractor is used
   - Identify slow PDFs

## Advanced Usage

### Testing Different PDF Types

Create a test suite:
1. Standard text resume
2. Scanned resume
3. Multi-column resume
4. Resume with tables
5. Image-heavy resume
6. Complex formatting resume

Upload all and compare results.

### Performance Testing

1. Upload 10+ PDFs
2. Note processing times
3. Calculate averages
4. Identify outliers
5. Optimize slow cases

### Quality Assessment

For each PDF:
1. Check text completeness (0-100%)
2. Check formatting preservation
3. Check column detection accuracy
4. Check table extraction quality
5. Rate overall quality (1-5 stars)

## Browser Console

For debugging, open browser console (F12):

```javascript
// See all results
console.log(results);

// Check specific result
console.log(results[0]);

// See API URL
console.log(API_URL);
```

## API Details

The webapp calls this endpoint:

```
POST http://localhost:8000/api/v1/parse
Content-Type: multipart/form-data

Request:
- file: PDF file (binary)

Response:
{
  "text": "full extracted text...",
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

## Files Structure

```
benchmark_webapp/
├── index.html          # Main webapp interface
├── server.py           # HTTP server with CORS
├── start.ps1           # Windows startup script
├── start.sh            # Linux/Mac startup script
└── README.md           # Detailed documentation
```

## Next Steps

After testing:

1. **Review Results**
   - Which extractor is used most?
   - Are processing times acceptable?
   - Is extraction quality good?

2. **Identify Issues**
   - Which PDFs fail?
   - What causes slow processing?
   - Are there accuracy problems?

3. **Optimize**
   - Enable GPU for faster OCR
   - Adjust extraction parameters
   - Handle edge cases

4. **Deploy**
   - Move to production
   - Monitor performance
   - Collect metrics

## Support

If you encounter issues:

1. Check resume_service logs
2. Check browser console (F12)
3. Verify both servers are running
4. Test with simple PDF first
5. Check network tab for API errors

## Conclusion

This benchmark webapp provides:
- ✅ Easy testing of PDF extraction
- ✅ Real-time results visualization
- ✅ Detailed metrics and metadata
- ✅ Comparison capabilities
- ✅ Beautiful, intuitive interface

Perfect for testing PyMuPDF + PaddleOCR integration before production deployment! 🚀
