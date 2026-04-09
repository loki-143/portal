from __future__ import annotations

from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from .base import ExtractionError, ExtractionResult, UnsupportedResumeError
from .docx import extract_docx
from .pdf import extract_pdf


def extract_resume(file_bytes: bytes, filename: str, content_type: str | None = None) -> ExtractionResult:
    extension = Path(filename).suffix.lower()

    if file_bytes.startswith(b"%PDF"):
        result = extract_pdf(file_bytes)
    elif file_bytes.startswith(b"PK"):
        result = _extract_zip_container(file_bytes)
    elif file_bytes.startswith(bytes.fromhex("D0CF11E0")) or extension == ".doc":
        raise UnsupportedResumeError("Legacy .doc resumes are not supported in v1")
    else:
        raise UnsupportedResumeError("Unsupported file type. Only PDF and DOCX are supported.")

    if not result.text.strip():
        raise ExtractionError("The uploaded resume does not contain extractable text.")

    return ExtractionResult(
        file_type=result.file_type,
        text=result.text,
        lines=result.lines,
        content_type=content_type or result.content_type,
        detected_columns=result.detected_columns,
        metadata=result.metadata,
    )


def _extract_zip_container(file_bytes: bytes) -> ExtractionResult:
    try:
        archive = ZipFile(BytesIO(file_bytes))
    except BadZipFile as exc:
        raise ExtractionError("The uploaded archive is not a valid DOCX file.") from exc

    names = set(archive.namelist())
    if "[Content_Types].xml" in names and "word/document.xml" in names:
        return extract_docx(file_bytes)
    raise UnsupportedResumeError("ZIP containers must be valid DOCX files.")
