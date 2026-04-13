"""Helper functions for benchmark operations."""

import re
from typing import Dict, Any


def calculate_text_metrics(text: str) -> Dict[str, Any]:
    """Calculate basic text metrics."""
    if not text:
        return {
            'char_count': 0,
            'word_count': 0,
            'line_count': 0
        }
    
    return {
        'char_count': len(text),
        'word_count': len(text.split()),
        'line_count': len(text.splitlines())
    }


def detect_multi_column(text: str) -> bool:
    """
    Detect if text likely came from multi-column layout.
    Heuristic: Check for unusual line breaks or short lines.
    """
    if not text:
        return False
    
    lines = text.splitlines()
    if len(lines) < 5:
        return False
    
    # Count short lines (less than 40 chars)
    short_lines = sum(1 for line in lines if len(line.strip()) < 40 and len(line.strip()) > 0)
    short_line_ratio = short_lines / len(lines)
    
    # If more than 60% lines are short, likely multi-column
    return short_line_ratio > 0.6


def format_time(seconds: float) -> str:
    """Format time in human-readable format."""
    if seconds < 1:
        return f"{seconds*1000:.0f}ms"
    return f"{seconds:.2f}s"


def format_number(num: int) -> str:
    """Format number with thousand separators."""
    return f"{num:,}"
