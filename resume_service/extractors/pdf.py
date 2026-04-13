from __future__ import annotations

import re
import zlib
from dataclasses import dataclass
from io import BytesIO

from .base import ExtractionResult

# PyMuPDF (fitz) - Fast and robust PDF parsing
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except Exception:  # pragma: no cover
    PYMUPDF_AVAILABLE = False

# RapidOCR - Fast and reliable OCR for image-based PDFs
try:
    from rapidocr_onnxruntime import RapidOCR
    from PIL import Image
    import numpy as np
    OCR_AVAILABLE = True
except Exception:  # pragma: no cover
    OCR_AVAILABLE = False

# Initialize RapidOCR once (lightweight, fast initialization)
_rapid_ocr_instance = None


def _get_rapid_ocr():
    """Get or create RapidOCR instance (singleton pattern)."""
    global _rapid_ocr_instance
    if _rapid_ocr_instance is None and OCR_AVAILABLE:
        try:
            _rapid_ocr_instance = RapidOCR()
        except Exception as e:
            print(f"Failed to initialize RapidOCR: {e}")
            return None
    return _rapid_ocr_instance


# Regex patterns for custom PDF parser (fallback)
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
    """
    Extract text from PDF with intelligent fallback.
    
    Strategy:
    1. Try PyMuPDF (fast, robust, handles complex layouts)
       - Detects if PDF is text-based or image-based
    2. If image-based, use Tesseract OCR (reliable, stable)
    3. Fallback to custom parser (last resort)
    """
    # Try PyMuPDF first (best for most PDFs)
    pymupdf_result = _extract_with_pymupdf(file_bytes)
    if pymupdf_result is not None:
        # Check if we got meaningful text
        if pymupdf_result.text.strip():
            print(f"PyMuPDF extracted {len(pymupdf_result.text)} characters")
            return pymupdf_result
        
        # If no text but PDF has images, try OCR
        if pymupdf_result.metadata.get('has_images', False):
            print(f"PDF has images but no text, trying RapidOCR...")
            ocr_result = _extract_with_rapid_ocr(file_bytes)
            if ocr_result is not None and ocr_result.text.strip():
                print(f"RapidOCR extracted {len(ocr_result.text)} characters")
                return ocr_result
            # If OCR also failed, return the pymupdf result (empty) to avoid custom parser
            # The custom parser can't handle image-based PDFs
            print("OCR extraction failed or returned no text")
            return pymupdf_result
    
    # Only try custom parser if PyMuPDF completely failed (not just empty text)
    # Don't use custom parser for image-based PDFs
    if pymupdf_result is None:
        print("PyMuPDF failed, trying custom parser...")
        layout_result = _extract_with_layout_parser(file_bytes)
        if layout_result is not None and layout_result.text.strip():
            return layout_result
    
    # Last resort: return empty result
    return ExtractionResult(
        file_type="pdf",
        text="",
        lines=[],
        content_type="application/pdf",
        detected_columns=1,
        metadata={"page_count": 0, "extractor_name": "none", "error": "Failed to extract text"},
    )


def _extract_with_pymupdf(file_bytes: bytes) -> ExtractionResult | None:
    """
    Extract text using PyMuPDF (fitz).
    
    PyMuPDF is:
    - 3-5x faster than pypdf
    - Better at handling complex layouts
    - Can detect images in PDF
    - Production-proven
    """
    if not PYMUPDF_AVAILABLE:
        return None
    
    try:
        # Open PDF from bytes
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        page_texts = []
        has_images = False
        total_text_length = 0
        x_positions = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Extract text with layout preservation
            text = page.get_text("text")
            
            if text and text.strip():
                page_texts.append(text.strip())
                total_text_length += len(text)
                
                # Get text positions for column detection
                blocks = page.get_text("dict")["blocks"]
                for block in blocks:
                    if block.get("type") == 0:  # Text block
                        x_positions.append(block.get("bbox", [0])[0])
            
            # Check for images
            image_list = page.get_images()
            if image_list:
                has_images = True
        
        page_count = len(doc)
        doc.close()
        
        # Combine all pages
        text = "\n\n".join(page_texts).strip()
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        
        # Detect columns
        detected_columns = _detect_columns(x_positions)
        
        metadata = {
            "page_count": page_count,
            "extractor_name": "pymupdf",
            "has_images": has_images,
            "text_length": total_text_length,
        }
        
        return ExtractionResult(
            file_type="pdf",
            text=text,
            lines=lines,
            content_type="application/pdf",
            detected_columns=detected_columns,
            metadata=metadata,
        )
        
    except Exception as e:
        print(f"PyMuPDF extraction failed: {e}")
        return None


def _extract_with_rapid_ocr(file_bytes: bytes) -> ExtractionResult | None:
    """
    Extract text from image-based PDF using RapidOCR.
    
    RapidOCR is:
    - Fast and lightweight (ONNX runtime)
    - No external dependencies (no Tesseract needed)
    - Good accuracy for English text
    - Works offline
    """
    if not OCR_AVAILABLE or not PYMUPDF_AVAILABLE:
        return None
    
    ocr = _get_rapid_ocr()
    if ocr is None:
        return None
    
    try:
        # Open PDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        all_text = []
        page_count = len(doc)
        
        for page_num in range(page_count):
            page = doc[page_num]
            
            # Convert page to image (high resolution for better OCR)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for quality
            
            # Convert to numpy array
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            
            # If image has alpha channel, convert to RGB
            if pix.n == 4:  # RGBA
                img = img[:, :, :3]  # Drop alpha channel
            
            # Run OCR
            try:
                ocr_output = ocr(img)
                # RapidOCR returns (result, elapse) tuple
                if isinstance(ocr_output, tuple) and len(ocr_output) >= 2:
                    result, elapse = ocr_output[0], ocr_output[1]
                else:
                    result = ocr_output
                
                if result:
                    print(f"RapidOCR page {page_num}: {len(result)} text blocks found")
                else:
                    print(f"RapidOCR page {page_num}: no text detected")
                    result = None
            except Exception as ocr_error:
                print(f"RapidOCR failed for page {page_num}: {ocr_error}")
                result = None
            
            if result:
                # RapidOCR returns: [[bbox, text, confidence], ...]
                page_text = []
                for item in result:
                    if item and len(item) >= 2:
                        text = item[1]  # text is at index 1
                        if text and isinstance(text, str) and text.strip():
                            page_text.append(text.strip())
                
                if page_text:
                    all_text.append("\n".join(page_text))
                    print(f"Extracted {len(page_text)} lines from page {page_num}")
        
        doc.close()
        
        # Combine all pages
        text = "\n\n".join(all_text).strip()
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        
        metadata = {
            "page_count": page_count,
            "extractor_name": "rapidocr",
            "ocr_used": True,
        }
        
        return ExtractionResult(
            file_type="pdf",
            text=text,
            lines=lines,
            content_type="application/pdf",
            detected_columns=1,  # OCR doesn't preserve column info easily
            metadata=metadata,
        )
        
    except Exception as e:
        print(f"RapidOCR extraction failed: {e}")
        return None


def _extract_with_layout_parser(file_bytes: bytes) -> ExtractionResult | None:
    """Custom PDF parser as last resort fallback."""
    try:
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
    except Exception as e:
        print(f"Custom parser failed: {e}")
        return None


# ============================================================
# CUSTOM PARSER HELPER FUNCTIONS (Fallback)
# ============================================================

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
