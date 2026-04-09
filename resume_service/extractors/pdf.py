from __future__ import annotations

import re
import zlib
from dataclasses import dataclass
from io import BytesIO

from .base import ExtractionResult

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    PdfReader = None


_OBJ_RE = re.compile(rb"(\d+)\s+(\d+)\s+obj\s*(.*?)\s*endobj", re.S)
_STREAM_RE = re.compile(rb"^(.*?)stream\r?\n(.*?)\r?\nendstream\s*$", re.S)
_BFCHAR_RE = re.compile(r"beginbfchar\s*(.*?)\s*endbfchar", re.S)
_BFRANGE_RE = re.compile(r"beginbfrange\s*(.*?)\s*endbfrange", re.S)
_TOKEN_RE = re.compile(r"\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f]+>|/[A-Za-z0-9]+|-?\d*\.\d+|-?\d+|\[|\]|BT|ET|Tf|Td|TD|Tm|T\*|Tj|TJ")
_STRING_TJ_RE = re.compile(r"\((?:\\.|[^\\)])*\)\s*Tj", re.S)
_STRING_TJ_ARRAY_RE = re.compile(r"\[(.*?)\]\s*TJ", re.S)
_PDF_STRING_RE = re.compile(r"\((?:\\.|[^\\)])*\)")


@dataclass(slots=True)
class _TextChunk:
    y: float
    x: float
    text: str


def extract_pdf(file_bytes: bytes) -> ExtractionResult:
    pypdf_result = _extract_with_pypdf(file_bytes)
    if pypdf_result is not None:
        layout_result = _extract_with_layout_parser(file_bytes)
        if layout_result is not None:
            pypdf_result.detected_columns = layout_result.detected_columns
            if not pypdf_result.text.strip() and layout_result.text.strip():
                return layout_result
        return pypdf_result

    layout_result = _extract_with_layout_parser(file_bytes)
    if layout_result is not None:
        return layout_result
    return ExtractionResult(
        file_type="pdf",
        text="",
        lines=[],
        content_type="application/pdf",
        detected_columns=1,
        metadata={"page_count": 0, "extractor_name": "custom-pdf"},
    )


def _extract_with_layout_parser(file_bytes: bytes) -> ExtractionResult | None:
    objects = _parse_objects(file_bytes)
    streams: dict[int, bytes] = {}
    font_maps = _build_font_maps(objects, streams)
    pages = _find_pages(objects)

    chunks: list[_TextChunk] = []
    x_positions: list[float] = []
    for page in pages:
        for content_id in page["content_ids"]:
            raw_stream = _get_stream(objects, streams, content_id)
            if not raw_stream:
                continue
            page_chunks = _extract_text_chunks(
                raw_stream.decode("latin1", "ignore"),
                page["fonts"],
                font_maps,
            )
            chunks.extend(page_chunks)
            x_positions.extend(chunk.x for chunk in page_chunks if chunk.text.strip())

    lines = _group_chunks(chunks)
    text = "\n".join(lines).strip()
    return ExtractionResult(
        file_type="pdf",
        text=text,
        lines=lines,
        content_type="application/pdf",
        detected_columns=_detect_columns(x_positions),
        metadata={"page_count": len(pages), "extractor_name": "custom-pdf"},
    )


def _extract_with_pypdf(file_bytes: bytes) -> ExtractionResult | None:
    if PdfReader is None:
        return None

    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception:
        return None

    page_texts: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        cleaned = text.replace("\r", "\n").strip()
        if cleaned:
            page_texts.append(cleaned)

    if not page_texts:
        return None

    text = "\n\n".join(page_texts).strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return ExtractionResult(
        file_type="pdf",
        text=text,
        lines=lines,
        content_type="application/pdf",
        detected_columns=1,
        metadata={"page_count": len(reader.pages), "extractor_name": "pypdf"},
    )


def _parse_objects(file_bytes: bytes) -> dict[int, bytes]:
    return {int(match.group(1)): match.group(3) for match in _OBJ_RE.finditer(file_bytes)}


def _get_stream(objects: dict[int, bytes], cache: dict[int, bytes], object_id: int) -> bytes | None:
    if object_id in cache:
        return cache[object_id]

    body = objects.get(object_id)
    if body is None:
        return None

    stream_match = _STREAM_RE.search(body)
    if not stream_match:
        return None

    raw = stream_match.group(2)
    try:
        data = zlib.decompress(raw)
    except zlib.error:
        data = raw

    cache[object_id] = data
    return data


def _build_font_maps(objects: dict[int, bytes], cache: dict[int, bytes]) -> dict[int, dict[int, str]]:
    font_maps: dict[int, dict[int, str]] = {}
    for object_id, body in objects.items():
        decoded = body.decode("latin1", "ignore")
        to_unicode_match = re.search(r"/ToUnicode\s+(\d+)\s+0\s+R", decoded)
        if not to_unicode_match:
            continue
        cmap_stream = _get_stream(objects, cache, int(to_unicode_match.group(1)))
        if cmap_stream:
            font_maps[object_id] = _parse_cmap(cmap_stream.decode("latin1", "ignore"))
    return font_maps


def _parse_cmap(cmap_text: str) -> dict[int, str]:
    mapping: dict[int, str] = {}

    for block in _BFCHAR_RE.findall(cmap_text):
        for source, destination in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            mapping[int(source, 16)] = bytes.fromhex(destination).decode("utf-16-be", "ignore")

    for block in _BFRANGE_RE.findall(cmap_text):
        for start_hex, end_hex, dst_hex in re.findall(
            r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>",
            block,
        ):
            start_code = int(start_hex, 16)
            end_code = int(end_hex, 16)
            destination = int(dst_hex, 16)
            width = len(dst_hex)
            for offset, code in enumerate(range(start_code, end_code + 1)):
                mapping[code] = bytes.fromhex(f"{destination + offset:0{width}X}").decode("utf-16-be", "ignore")

    return mapping


def _find_pages(objects: dict[int, bytes]) -> list[dict[str, object]]:
    pages: list[dict[str, object]] = []
    for body in objects.values():
        decoded = body.decode("latin1", "ignore")
        if "/Type /Page" not in decoded or "/Type /Pages" in decoded:
            continue
        content_ids = _extract_content_ids(decoded)
        if not content_ids:
            continue
        pages.append(
            {
                "content_ids": content_ids,
                "fonts": _extract_page_fonts(decoded, objects),
            }
        )
    return pages


def _extract_content_ids(page_body: str) -> list[int]:
    direct_match = re.findall(r"/Contents\s+(\d+)\s+0\s+R", page_body)
    if direct_match:
        return [int(match) for match in direct_match]
    array_match = re.search(r"/Contents\s*\[(.*?)\]", page_body, re.S)
    if not array_match:
        return []
    return [int(match) for match in re.findall(r"(\d+)\s+0\s+R", array_match.group(1))]


def _extract_page_fonts(page_body: str, objects: dict[int, bytes]) -> dict[str, int]:
    font_dict = _extract_font_dict_block(page_body)
    if font_dict:
        return {name: int(obj) for name, obj in re.findall(r"/([A-Za-z0-9]+)\s+(\d+)\s+0\s+R", font_dict)}

    resources_match = re.search(r"/Resources\s+(\d+)\s+0\s+R", page_body)
    if not resources_match:
        return {}

    resource_object = objects.get(int(resources_match.group(1)))
    if not resource_object:
        return {}

    resource_body = resource_object.decode("latin1", "ignore")
    font_dict = _extract_font_dict_block(resource_body)
    if not font_dict:
        return {}

    return {name: int(obj) for name, obj in re.findall(r"/([A-Za-z0-9]+)\s+(\d+)\s+0\s+R", font_dict)}


def _extract_font_dict_block(body: str) -> str | None:
    font_start = body.find("/Font")
    if font_start == -1:
        return None
    dict_start = body.find("<<", font_start)
    if dict_start == -1:
        return None

    depth = 0
    index = dict_start
    while index < len(body) - 1:
        pair = body[index : index + 2]
        if pair == "<<":
            depth += 1
            index += 2
            continue
        if pair == ">>":
            depth -= 1
            index += 2
            if depth == 0:
                return body[dict_start:index]
            continue
        index += 1
    return None


def _extract_text_chunks(
    content_stream: str,
    page_fonts: dict[str, int],
    font_maps: dict[int, dict[int, str]],
) -> list[_TextChunk]:
    tokens = _TOKEN_RE.findall(content_stream)

    chunks: list[_TextChunk] = []
    operands: list[object] = []
    in_array = False
    array_values: list[str] = []
    current_font_name: str | None = None
    x = 0.0
    y = 0.0

    for token in tokens:
        if token == "[":
            in_array = True
            array_values = []
            continue
        if token == "]":
            in_array = False
            operands.append(("array", array_values.copy()))
            continue
        if in_array:
            array_values.append(token)
            continue
        if re.fullmatch(r"-?\d*\.\d+|-?\d+", token):
            operands.append(float(token))
            continue
        if token.startswith("/F") or token.startswith("<") or token.startswith("("):
            operands.append(token)
            continue
        if token == "Tf":
            if len(operands) >= 2 and isinstance(operands[-2], str):
                current_font_name = operands[-2][1:]
            operands.clear()
            continue
        if token == "Tm":
            if len(operands) >= 6:
                x = float(operands[-2])
                y = float(operands[-1])
            operands.clear()
            continue
        if token in {"Td", "TD"}:
            if len(operands) >= 2:
                x += float(operands[-2])
                y += float(operands[-1])
            operands.clear()
            continue
        if token == "T*":
            y -= 12
            x = 0
            operands.clear()
            continue
        if token == "Tj":
            if operands and isinstance(operands[-1], str):
                text = _decode_operand(operands[-1], current_font_name, page_fonts, font_maps)
                if text.strip():
                    chunks.append(_TextChunk(y=y, x=x, text=text))
            operands.clear()
            continue
        if token == "TJ":
            if operands and isinstance(operands[-1], tuple):
                values = [
                    _decode_operand(item, current_font_name, page_fonts, font_maps)
                    for item in operands[-1][1]
                    if item.startswith("<") or item.startswith("(")
                ]
                joined = "".join(values).strip()
                if joined:
                    chunks.append(_TextChunk(y=y, x=x, text=joined))
            operands.clear()
            continue
        operands.clear()

    if not chunks:
        chunks.extend(_extract_literal_chunks(content_stream))
    return chunks


def _decode_operand(
    operand: str,
    current_font_name: str | None,
    fonts: dict[str, int],
    font_maps: dict[int, dict[int, str]],
) -> str:
    if operand.startswith("("):
        return _decode_literal_string(operand)
    if not operand.startswith("<"):
        return ""

    hex_text = operand[1:-1]
    if not hex_text:
        return ""

    font_object = fonts.get(current_font_name or "")
    cmap = font_maps.get(font_object, {}) if font_object else {}
    if not cmap:
        return _decode_hex_without_cmap(hex_text)
    step = 4 if len(hex_text) % 4 == 0 else 2
    decoded: list[str] = []
    for index in range(0, len(hex_text), step):
        code = int(hex_text[index : index + step], 16)
        decoded.append(cmap.get(code, _decode_hex_without_cmap(hex_text[index : index + step])))
    return "".join(decoded)


def _decode_hex_without_cmap(hex_text: str) -> str:
    try:
        if len(hex_text) % 4 == 0:
            decoded = bytes.fromhex(hex_text).decode("utf-16-be", "ignore")
            cleaned = "".join(ch for ch in decoded if ch.isprintable() or ch in "\n\t ")
            if cleaned.strip():
                return cleaned
    except Exception:
        pass

    try:
        decoded = bytes.fromhex(hex_text).decode("latin1", "ignore")
        cleaned = "".join(ch for ch in decoded if ch.isprintable() or ch in "\n\t ")
        return cleaned
    except Exception:
        return ""


def _decode_literal_string(literal: str) -> str:
    buffer: list[str] = []
    index = 1
    while index < len(literal) - 1:
        char = literal[index]
        if char != "\\":
            buffer.append(char)
            index += 1
            continue

        index += 1
        if index >= len(literal) - 1:
            break

        escaped = literal[index]
        escape_map = {
            "n": "\n",
            "r": "\r",
            "t": "\t",
            "b": "\b",
            "f": "\f",
            "\\": "\\",
            "(": "(",
            ")": ")",
        }
        if escaped in escape_map:
            buffer.append(escape_map[escaped])
            index += 1
            continue
        if escaped.isdigit():
            digits = escaped
            for _ in range(2):
                if index + 1 < len(literal) - 1 and literal[index + 1].isdigit():
                    index += 1
                    digits += literal[index]
            buffer.append(chr(int(digits, 8)))
            index += 1
            continue
        buffer.append(escaped)
        index += 1
    return "".join(buffer)


def _extract_literal_chunks(content_stream: str) -> list[_TextChunk]:
    chunks: list[_TextChunk] = []
    for index, match in enumerate(_STRING_TJ_RE.finditer(content_stream)):
        literal = match.group(0).rsplit("Tj", 1)[0].strip()
        text = _decode_literal_string(literal)
        if text.strip():
            chunks.append(_TextChunk(y=1000.0 - index, x=0.0, text=text))

    for index, match in enumerate(_STRING_TJ_ARRAY_RE.finditer(content_stream)):
        pieces = [_decode_literal_string(token) for token in _PDF_STRING_RE.findall(match.group(1))]
        text = "".join(pieces).strip()
        if text:
            chunks.append(_TextChunk(y=900.0 - index, x=0.0, text=text))
    return chunks


def _group_chunks(chunks: list[_TextChunk]) -> list[str]:
    groups: list[dict[str, object]] = []
    for chunk in sorted(chunks, key=lambda item: (-item.y, item.x)):
        match_group = None
        for group in groups:
            if abs(group["y"] - chunk.y) <= 2.0:
                match_group = group
                break
        if match_group is None:
            match_group = {"y": chunk.y, "items": []}
            groups.append(match_group)
        match_group["items"].append((chunk.x, chunk.text))

    lines: list[str] = []
    for group in groups:
        ordered = ""
        last_x: float | None = None
        last_text = ""
        for x, text in sorted(group["items"], key=lambda item: item[0]):
            chunk = text.strip("\n")
            if not chunk:
                continue
            if ordered and last_x is not None:
                gap = x - last_x
                if gap > 14 and not ordered.endswith(" ") and not chunk.startswith(" "):
                    ordered += " "
            ordered += chunk
            last_x = x
            last_text = chunk
        ordered = re.sub(r"\s+", " ", ordered).strip()
        if ordered:
            lines.append(ordered)
    return lines


def _detect_columns(x_positions: list[float]) -> int:
    if not x_positions:
        return 1
    left = sum(1 for value in x_positions if value < 180)
    right = sum(1 for value in x_positions if value > 260)
    threshold = max(1, int(0.15 * len(x_positions)))
    return 2 if left >= threshold and right >= threshold else 1
