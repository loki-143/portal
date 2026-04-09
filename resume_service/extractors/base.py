from __future__ import annotations

from dataclasses import dataclass, field


class ExtractionError(ValueError):
    """Raised when text extraction fails."""


class UnsupportedResumeError(ExtractionError):
    """Raised when a file type is unsupported."""


@dataclass(slots=True)
class ExtractionResult:
    file_type: str
    text: str
    lines: list[str]
    content_type: str | None = None
    detected_columns: int = 1
    metadata: dict[str, object] = field(default_factory=dict)

