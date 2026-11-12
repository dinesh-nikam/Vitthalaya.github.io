"""Entity normalization, title cleaning, fuzzy deduplication, and identity resolution."""

import re
import unicodedata
from typing import Optional, Tuple


def normalize_string(text: Optional[str]) -> str:
    """Normalizes string: converts to lowercase, strips punctuation, preserves Unicode letters, marks, and numbers."""
    if not text:
        return ""
    nfkc = unicodedata.normalize("NFKC", text)
    lowered = nfkc.lower()
    result = []
    for char in lowered:
        cat = unicodedata.category(char)
        if cat[0] in ("L", "M", "N"):
            result.append(char)
        else:
            result.append(" ")
    return re.sub(r"\s+", " ", "".join(result)).strip()


def clean_song_title(raw_title: Optional[str]) -> str:
    """Strips release noise like '(Remastered 2021)', '[Official Video]', '- Deluxe Edition'."""
    if not raw_title:
        return ""
    cleaned = raw_title
    # Patterns to remove
    noise_patterns = [
        r"\s*[\(\[]\s*(?:official\s*(?:video|audio|music\s*video|lyric\s*video)?|audio|lyrics?)\s*[\)\]]",
        r"\s*[\(\[]\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|deluxe(?:\s*edition)?|mono|stereo|bonus\s*track|live|acoustic|edit|radio\s*edit)(?:\s*\d{4})?\s*[\)\]]",
        r"\s*-\s*(?:\d{4}\s*)?(?:remaster(?:ed)?|deluxe(?:\s*edition)?|live|acoustic|radio\s*edit).*$",
        r"\s*[\(\[]\s*feat(?:\.|\s+).*?[\)\]]",
        r"\s*ft\.?\s+.*$",
    ]
    for pattern in noise_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def extract_featured_artists(raw_title: Optional[str]) -> Tuple[str, list[str]]:
    """Extracts featured artists from title strings like 'Song (feat. Artist B & Artist C)'."""
    if not raw_title:
        return "", []
    feat_match = re.search(r"[\(\[]\s*(?:feat\.?|featuring)\s+([^\]\)]+)[\)\]]", raw_title, re.IGNORECASE)
    featured = []
    base_title = raw_title
    if feat_match:
        feat_str = feat_match.group(1)
        # Split by comma, &, 'and'
        parts = re.split(r"[,&]|\band\b", feat_str)
        featured = [p.strip() for p in parts if p.strip()]
        base_title = clean_song_title(raw_title)
    return base_title, featured


def levenshtein_similarity(s1: str, s2: str) -> float:
    """Calculates normalized Levenshtein similarity between 0.0 and 1.0."""
    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    len1, len2 = len(s1), len(s2)
    matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]

    for i in range(len1 + 1):
        matrix[i][0] = i
    for j in range(len2 + 1):
        matrix[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            matrix[i][j] = min(
                matrix[i - 1][j] + 1,       # deletion
                matrix[i][j - 1] + 1,       # insertion
                matrix[i - 1][j - 1] + cost  # substitution
            )

    dist = matrix[len1][len2]
    max_len = max(len1, len2)
    return 1.0 - (dist / max_len)


def is_same_song(
    title1: str,
    artist1: str,
    title2: str,
    artist2: str,
    isrc1: Optional[str] = None,
    isrc2: Optional[str] = None,
    similarity_threshold: float = 0.88,
) -> bool:
    """Determines whether two song records refer to the identical musical work."""
    # 1. Exact ISRC match (definitive standard)
    if isrc1 and isrc2 and isrc1.strip().upper() == isrc2.strip().upper():
        return True

    # 2. Normalized title and artist comparison
    norm_t1 = normalize_string(clean_song_title(title1))
    norm_t2 = normalize_string(clean_song_title(title2))
    norm_a1 = normalize_string(artist1)
    norm_a2 = normalize_string(artist2)

    if norm_t1 == norm_t2 and norm_a1 == norm_a2:
        return True

    # 3. Fuzzy match
    title_sim = levenshtein_similarity(norm_t1, norm_t2)
    artist_sim = levenshtein_similarity(norm_a1, norm_a2)

    # Both artist and title must score sufficiently high
    weighted_score = (title_sim * 0.6) + (artist_sim * 0.4)
    return weighted_score >= similarity_threshold and title_sim >= 0.82
