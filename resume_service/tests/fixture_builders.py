from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


FIXTURE_DIR = Path(__file__).parent / "fixtures"


def load_case(name: str) -> dict:
    return json.loads((FIXTURE_DIR / f"{name}.json").read_text(encoding="utf-8"))


def build_docx(lines: list[str], *, table_rows: list[list[str]] | None = None) -> bytes:
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""
    paragraphs = "".join(
        f"<w:p><w:r><w:t>{_xml_escape(line)}</w:t></w:r></w:p>"
        for line in lines
    )
    table_xml = ""
    if table_rows:
        table_xml = "<w:tbl>" + "".join(
            "<w:tr>"
            + "".join(f"<w:tc><w:p><w:r><w:t>{_xml_escape(cell)}</w:t></w:r></w:p></w:tc>" for cell in row)
            + "</w:tr>"
            for row in table_rows
        ) + "</w:tbl>"
    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {paragraphs}
    {table_xml}
  </w:body>
</w:document>
"""
    buffer = BytesIO()
    with ZipFile(buffer, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document)
    return buffer.getvalue()


def build_pdf(lines: list[str], *, image_only: bool = False, pages: list[list[str]] | None = None, right_column_lines: list[str] | None = None) -> bytes:
    if image_only:
        page_streams = ["q 1 0 0 1 0 0 cm 0 0 100 100 re S Q"]
    else:
        page_sets = pages or [lines]
        page_streams = [_build_pdf_page(page_lines, right_column_lines if index == 0 else None) for index, page_lines in enumerate(page_sets)]

    objects: list[bytes] = [b"<< /Type /Catalog /Pages 2 0 R >>"]
    page_object_ids: list[int] = []
    stream_object_ids: list[int] = []
    font_object_id = 3 + (len(page_streams) * 2)
    kids: list[str] = []

    current_id = 3
    for stream_text in page_streams:
        page_object_id = current_id
        stream_object_id = current_id + 1
        page_object_ids.append(page_object_id)
        stream_object_ids.append(stream_object_id)
        kids.append(f"{page_object_id} 0 R")
        current_id += 2

    objects.append(f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {len(page_streams)} >>".encode("latin1"))
    for page_index, (page_object_id, stream_object_id) in enumerate(zip(page_object_ids, stream_object_ids, strict=True)):
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {stream_object_id} 0 R /Resources << /Font << /F1 {font_object_id} 0 R >> >> >>".encode("latin1")
        )
        stream = page_streams[page_index].encode("latin1", "ignore")
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode("latin1") + stream + b"\nendstream")
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin1"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010} 00000 n \n".encode("latin1"))
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode("latin1")
    )
    return bytes(pdf)


def build_legacy_doc_stub() -> bytes:
    return bytes.fromhex("D0CF11E0A1B11AE1") + b"legacy-doc"


def _build_pdf_page(lines: list[str], right_column_lines: list[str] | None = None) -> str:
    commands = ["BT", "/F1 11 Tf", "40 780 Td"]
    first = True
    for line in lines:
        if not first:
            commands.append("0 -15 Td")
        commands.append(f"({_pdf_escape(line)}) Tj")
        first = False
    commands.append("ET")
    if right_column_lines:
        commands.extend(["BT", "/F1 11 Tf", "320 780 Td"])
        first = True
        for line in right_column_lines:
            if not first:
                commands.append("0 -15 Td")
            commands.append(f"({_pdf_escape(line)}) Tj")
            first = False
        commands.append("ET")
    return "\n".join(commands)


def _xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
