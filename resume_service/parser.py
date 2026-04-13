from __future__ import annotations

import hashlib
import re

from .extractors import ExtractionError, UnsupportedResumeError, extract_resume
from .normalization import normalize_resume
from .schemas import CandidateType, ParseResumeResponse, ParserMetadata
from .scoring import score_resume_quality
from .settings import SETTINGS


def parse_resume_document(
    *,
    file_bytes: bytes,
    filename: str,
    resume_id: str,
    candidate_type: CandidateType,
    content_type: str | None = None,
) -> ParseResumeResponse:
    if len(file_bytes) > SETTINGS.max_file_size_bytes:
        raise ExtractionError(f"Resume exceeds the {SETTINGS.max_file_size_bytes // (1024 * 1024)} MB limit.")

    try:
        extraction = extract_resume(file_bytes, filename=filename, content_type=content_type)
    except ExtractionError as exc:
        # With PyMuPDF + PaddleOCR, we can handle image-based PDFs
        # Only raise if extraction completely failed
        raise
    
    # Check if we got any text at all
    if len(extraction.text.strip()) < SETTINGS.minimum_text_characters:
        raise UnsupportedResumeError(
            f"Could not extract sufficient text from resume. "
            f"Extracted {len(extraction.text.strip())} characters, minimum required is {SETTINGS.minimum_text_characters}. "
            f"The PDF may be corrupted, password-protected, or contain only images without text."
        )

    normalized, warnings, missing_fields, section_order, sensitive_findings = normalize_resume(
        extraction.lines,
        extraction.text,
        candidate_type,
    )
    fingerprint = _content_fingerprint(extraction.text)

    metadata = ParserMetadata(
        filename=filename,
        file_type=extraction.file_type,
        content_type=content_type or extraction.content_type,
        file_size_bytes=len(file_bytes),
        line_count=len(extraction.lines),
        page_count=int(extraction.metadata.get("page_count", 1) or 1),
        extractor_name=str(extraction.metadata.get("extractor_name") or extraction.file_type),
        section_order=section_order,
        detected_columns=extraction.detected_columns,
        is_scanned=False,
        content_fingerprint=fingerprint,
        sensitive_findings=sensitive_findings,
        extracted_text=extraction.text,
    )

    if extraction.detected_columns > 1:
        warnings.append("Two-column layout detected; section ordering was normalized before extraction.")

    resume_quality = score_resume_quality(
        resume_id=resume_id,
        normalized_resume=normalized,
        resume_text=extraction.text,
    )

    return ParseResumeResponse(
        resume_id=resume_id,
        candidate_type=candidate_type,
        normalized_resume=normalized,
        warnings=warnings,
        missing_fields=missing_fields,
        resume_quality=resume_quality,
        parser_metadata=metadata,
    )


def _content_fingerprint(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text).strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
