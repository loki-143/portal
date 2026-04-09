from __future__ import annotations

import xml.etree.ElementTree as ET
from io import BytesIO
from zipfile import ZipFile

from .base import ExtractionError, ExtractionResult

_WORD_NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def extract_docx(file_bytes: bytes) -> ExtractionResult:
    try:
        archive = ZipFile(BytesIO(file_bytes))
    except Exception as exc:  # pragma: no cover
        raise ExtractionError("Failed to open DOCX archive") from exc

    document_parts = [
        name
        for name in archive.namelist()
        if name == "word/document.xml" or name.startswith("word/header") or name.startswith("word/footer")
    ]
    if "word/document.xml" not in document_parts:
        raise ExtractionError("DOCX file is missing word/document.xml")

    ordered_parts = sorted(document_parts, key=_part_sort_key)
    lines: list[str] = []

    for part_name in ordered_parts:
        xml_bytes = archive.read(part_name)
        try:
            root = ET.fromstring(xml_bytes)
        except ET.ParseError as exc:
            raise ExtractionError(f"Failed to parse DOCX XML part: {part_name}") from exc

        lines.extend(_extract_part_lines(root))

    text = "\n".join(lines).strip()
    return ExtractionResult(
        file_type="docx",
        text=text,
        lines=lines,
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        detected_columns=1,
        metadata={"parts": ordered_parts, "page_count": 1, "extractor_name": "docx-xml"},
    )


def _part_sort_key(part_name: str) -> tuple[int, str]:
    if part_name.startswith("word/header"):
        return (0, part_name)
    if part_name == "word/document.xml":
        return (1, part_name)
    return (2, part_name)


def _extract_part_lines(root: ET.Element) -> list[str]:
    body = root.find(".//w:body", _WORD_NS)
    if body is None:
        return []

    lines: list[str] = []
    for child in body:
        tag = _local_name(child.tag)
        if tag == "p":
            paragraph_text = _paragraph_text(child)
            if paragraph_text:
                lines.append(paragraph_text)
            continue
        if tag == "tbl":
            lines.extend(_table_lines(child))
    return lines


def _paragraph_text(paragraph: ET.Element) -> str:
    text = "".join(node.text or "" for node in paragraph.findall(".//w:t", _WORD_NS)).strip()
    return " ".join(text.split())


def _table_lines(table: ET.Element) -> list[str]:
    lines: list[str] = []
    for row in table.findall("./w:tr", _WORD_NS):
        row_cells: list[str] = []
        for cell in row.findall("./w:tc", _WORD_NS):
            cell_lines = [
                _paragraph_text(paragraph)
                for paragraph in cell.findall(".//w:p", _WORD_NS)
                if _paragraph_text(paragraph)
            ]
            if cell_lines:
                row_cells.append(" ".join(cell_lines))
        if row_cells:
            lines.append(" | ".join(row_cells))
    return lines


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]
