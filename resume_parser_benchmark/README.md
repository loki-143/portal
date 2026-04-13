# Resume Parser Benchmark: pypdf vs LiteParse

Comprehensive benchmark comparing pypdf and LiteParse (with OCR) for resume parsing.

## Overview

This benchmark tests two PDF parsing approaches:
- **pypdf**: Pure text extraction library
- **LiteParse**: Advanced parser with OCR capabilities

## Metrics Compared

- Extraction time (seconds)
- Text length (characters)
- Word count
- Line count
- Column detection accuracy
- OCR success rate
- Error handling

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Tesseract OCR

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download installer from: https://github.com/UB-Mannheim/tesseract/wiki

### 3. Verify Installation

```bash
tesseract --version
```

## Usage

### 1. Add Sample Resumes

Place your test PDF files in the `sample_resumes/` folder:
- `simple_text.pdf` - Standard text-based resume
- `multi_column.pdf` - Resume with multiple columns
- `with_tables.pdf` - Resume containing tables
- `image_based.pdf` - Scanned/image-based resume

### 2. Run Benchmark

```bash
python benchmark.py
```

### 3. View Results

Results are saved in the `results/` folder:
- `comparison.csv` - Detailed metrics for each file
- `summary.txt` - Human-readable summary
- `charts.png` - Visual comparison charts

## Interpreting Results

### Extraction Time
Lower is better. Measures parsing speed.

### Text Metrics
- **Character count**: Total characters extracted
- **Word count**: Total words extracted
- **Line count**: Number of lines detected

### OCR Success
Percentage of files successfully processed with OCR (LiteParse only).

### Column Detection
Ability to detect multi-column layouts (important for resume formatting).

## Example Output

```
=== BENCHMARK SUMMARY ===

pypdf:
  Average time: 0.15s
  Average characters: 2,450
  Success rate: 75%

LiteParse:
  Average time: 1.23s
  Average characters: 2,890
  Success rate: 100%
  OCR enabled: Yes
```

## Notes

- LiteParse is slower but more accurate on image-based PDFs
- pypdf is faster but may miss text in scanned documents
- Multi-column detection is crucial for proper resume parsing
