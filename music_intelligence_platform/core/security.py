"""Security, sanitization, and input safety utilities."""

import html
import re
from typing import Optional


def sanitize_text(text: Optional[str]) -> Optional[str]:
    """Sanitizes user input and crawled text, removing unsafe control characters while preserving unicode."""
    if not text:
        return None
    # Unescape HTML entities
    unescaped = html.unescape(text)
    # Remove control characters except standard whitespace
    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", unescaped)
    # Normalize multiple whitespace into single space while preserving line breaks if needed
    cleaned = re.sub(r"[ \t]+", " ", cleaned).strip()
    return cleaned if cleaned else None


def clean_lyrics_text(lyrics: Optional[str]) -> Optional[str]:
    """Cleans lyrics text preserving verse linebreaks and structure."""
    if not lyrics:
        return None
    unescaped = html.unescape(lyrics)
    # Remove script or style tags if any leaked in
    cleaned = re.sub(r"<script.*?>.*?</script>", "", unescaped, flags=re.DOTALL | re.IGNORECASE)
    cleaned = re.sub(r"<style.*?>.*?</style>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    # Replace <br> with newlines
    cleaned = re.sub(r"<br\s*/?>", "\n", cleaned, flags=re.IGNORECASE)
    # Remove any remaining HTML tags
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    # Clean whitespace per line
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.splitlines()]
    # Normalize multiple empty lines to maximum 2 empty lines
    normalized_lines = []
    empty_count = 0
    for line in lines:
        if not line:
            empty_count += 1
            if empty_count <= 2:
                normalized_lines.append("")
        else:
            empty_count = 0
            normalized_lines.append(line)
    result = "\n".join(normalized_lines).strip()
    return result if result else None
