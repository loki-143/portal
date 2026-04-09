from __future__ import annotations

import re
from dataclasses import dataclass


class MultipartError(ValueError):
    """Raised when multipart parsing fails."""


@dataclass(slots=True)
class MultipartPart:
    name: str
    data: bytes
    filename: str | None = None
    content_type: str | None = None

    @property
    def text(self) -> str:
        return self.data.decode("utf-8", "ignore").strip()


_BOUNDARY_RE = re.compile(r'boundary=(?:"([^"]+)"|([^;]+))')
_DISPOSITION_PARAM_RE = re.compile(r'([a-zA-Z0-9_-]+)="([^"]*)"')


def parse_multipart(body: bytes, content_type: str | None) -> dict[str, MultipartPart]:
    if not content_type or "multipart/form-data" not in content_type.lower():
        raise MultipartError("Content-Type must be multipart/form-data")

    boundary_match = _BOUNDARY_RE.search(content_type)
    if not boundary_match:
        raise MultipartError("Multipart boundary is missing")

    boundary = (boundary_match.group(1) or boundary_match.group(2) or "").strip()
    if not boundary:
        raise MultipartError("Multipart boundary is empty")

    delimiter = f"--{boundary}".encode("utf-8")
    raw_parts = body.split(delimiter)
    parsed: dict[str, MultipartPart] = {}

    for raw_part in raw_parts[1:]:
        if raw_part.startswith(b"--"):
            break

        chunk = raw_part.strip(b"\r\n")
        if not chunk:
            continue

        header_blob, separator, payload = chunk.partition(b"\r\n\r\n")
        if not separator:
            raise MultipartError("Multipart part is missing header separator")

        headers = _parse_headers(header_blob.decode("utf-8", "ignore"))
        disposition = headers.get("content-disposition", "")
        if "form-data" not in disposition:
            continue

        params = {
            key.lower(): value
            for key, value in _DISPOSITION_PARAM_RE.findall(disposition)
        }
        name = params.get("name")
        if not name:
            raise MultipartError("Multipart part is missing a field name")

        parsed[name] = MultipartPart(
            name=name,
            filename=params.get("filename"),
            content_type=headers.get("content-type"),
            data=payload.rstrip(b"\r\n"),
        )

    if not parsed:
        raise MultipartError("No multipart fields were found")

    return parsed


def _parse_headers(header_blob: str) -> dict[str, str]:
    headers: dict[str, str] = {}
    for line in header_blob.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        headers[key.strip().lower()] = value.strip()
    return headers

