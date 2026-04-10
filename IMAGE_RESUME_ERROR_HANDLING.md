# Image-Based Resume Error Handling

## Issue
Resume service returns a 422 error when users upload image-based or scanned PDFs:
```
"Image-based or scanned resumes are not supported in v1."
```

This error message wasn't user-friendly and didn't provide guidance on how to fix the issue.

## Root Cause
The resume parser (v1) can only extract text from text-based PDFs and DOCX files. It cannot process:
- Scanned PDFs (images of documents)
- Image-based PDFs (PDFs containing only images)
- PDFs without extractable text

## Solution
Added better error handling with user-friendly guidance in both registration and job application flows.

### Implementation

#### 1. Register Page (`frontend/candidatePages/src/app/register/page.tsx`)
Updated error handling to detect image-based resume errors and provide helpful guidance:

```typescript
catch (err) {
  const errorMessage = err instanceof Error ? err.message : "Failed to upload resume";
  
  // Provide helpful guidance for image-based PDFs
  if (errorMessage.includes("Image-based") || errorMessage.includes("scanned")) {
    setError(
      "This resume appears to be a scanned image or image-based PDF. " +
      "Please upload a text-based PDF or DOCX file. " +
      "You can convert your resume using online tools or recreate it in Word/Google Docs."
    );
  } else {
    setError(errorMessage);
  }
}
```

#### 2. Apply Page (`frontend/candidatePages/src/app/apply/page.tsx`)
Added the same error handling for job applications.

### User Experience

#### Before
- Error: "Image-based or scanned resumes are not supported in v1."
- User confused about what to do
- No guidance on how to fix the issue

#### After
- Error: "This resume appears to be a scanned image or image-based PDF. Please upload a text-based PDF or DOCX file. You can convert your resume using online tools or recreate it in Word/Google Docs."
- Clear explanation of the problem
- Actionable guidance on how to fix it
- Suggests conversion tools or recreation

### Files Modified
1. `frontend/candidatePages/src/app/register/page.tsx` - Registration resume upload
2. `frontend/candidatePages/src/app/apply/page.tsx` - Job application resume upload

---

## Alternative Solutions for Future

### Option 1: Add OCR Support (Recommended)
Integrate OCR (Optical Character Recognition) to extract text from image-based PDFs:
- Use Tesseract OCR
- Use cloud OCR services (Google Cloud Vision, AWS Textract, Azure Computer Vision)
- Add as v2 parser with OCR capabilities

**Pros:**
- Supports all PDF types
- Better user experience
- No user action required

**Cons:**
- Additional cost (if using cloud services)
- Slower processing time
- May have accuracy issues

### Option 2: Client-Side Validation
Add file validation before upload to detect image-based PDFs:
- Check if PDF contains text layers
- Warn user before attempting upload
- Suggest conversion tools

**Pros:**
- Faster feedback
- Saves server resources
- Better UX

**Cons:**
- Requires PDF.js or similar library
- May not catch all cases
- Adds client-side complexity

### Option 3: Provide Conversion Service
Offer built-in PDF conversion:
- Convert image PDFs to text PDFs using OCR
- Automatic conversion in background
- Notify user when ready

**Pros:**
- Seamless user experience
- No user action required
- Handles all formats

**Cons:**
- Complex implementation
- Processing time
- Storage requirements

---

## Recommended User Guidance

### For Users with Image-Based PDFs

**Option 1: Recreate in Word/Google Docs**
1. Open Microsoft Word or Google Docs
2. Recreate your resume with the same content
3. Export as PDF or save as DOCX
4. Upload the new file

**Option 2: Use Online Conversion Tools**
- [Adobe Acrobat Online](https://www.adobe.com/acrobat/online/pdf-to-word.html)
- [Smallpdf](https://smallpdf.com/pdf-to-word)
- [ILovePDF](https://www.ilovepdf.com/pdf_to_word)

**Option 3: Use OCR Software**
- Adobe Acrobat Pro (OCR feature)
- ABBYY FineReader
- Google Drive (automatic OCR on upload)

---

## Testing Checklist

### Test Cases
- [ ] Upload text-based PDF - should succeed
- [ ] Upload DOCX file - should succeed
- [ ] Upload scanned PDF - should show helpful error
- [ ] Upload image-based PDF - should show helpful error
- [ ] Upload corrupted PDF - should show generic error
- [ ] Upload non-PDF file - should show validation error

### Error Message Validation
- [ ] Error message is clear and understandable
- [ ] Error message provides actionable guidance
- [ ] Error message suggests conversion tools
- [ ] Error message doesn't expose technical details

### User Flow
- [ ] User can retry upload after seeing error
- [ ] User can skip resume upload and continue
- [ ] Error doesn't block account creation
- [ ] Error doesn't block job application (if resume is optional)

---

## Backend Error Response

The resume service returns:
```json
{
  "request_id": "74a00be5-83d8-45f4-9534-4aa756dd3c54",
  "endpoint": "/v1/parse",
  "status": 422,
  "failure_reason": "Image-based or scanned resumes are not supported in v1."
}
```

Frontend catches this and transforms it into user-friendly guidance.

---

## Future Enhancements

1. **Add file preview** - Show PDF preview before upload
2. **Add file validation** - Check PDF type before upload
3. **Add OCR support** - Process image-based PDFs automatically
4. **Add conversion service** - Convert PDFs in-app
5. **Add progress indicator** - Show parsing progress
6. **Add retry mechanism** - Auto-retry failed uploads
7. **Add file type detection** - Detect and warn about image PDFs

---

## Status
✅ Implemented - Better error messages with user guidance
🔄 Future - OCR support for image-based PDFs
