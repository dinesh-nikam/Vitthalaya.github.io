"""Poetic, rhythmic, and lyrical structure analysis engine."""

from collections import Counter
import re
from typing import Any, Dict, List, Tuple


def count_syllables_english(word: str) -> int:
    """Estimates the syllable count of an English word using phonetic morphology rules."""
    word = word.lower().strip()
    if not word or not re.search(r"[a-z]", word):
        return 0
    # Strip non-alphabetic
    word = re.sub(r"[^a-z]", "", word)
    if len(word) <= 3:
        return 1

    # Remove silent e at the end
    word = re.sub(r"(?:[^laeiouy]|ed|es)e$", "", word)
    # Remove consecutive vowels
    vowels = re.findall(r"[aeiouy]{1,2}", word)
    count = len(vowels)
    return max(1, count)


def count_syllables_devanagari(text: str) -> int:
    """Counts syllables (अक्षरे) in Devanagari text following metric principles (छंदशास्त्र)."""
    # Exclude virama (halant \u094D) as it joins consonants
    # Count independent vowels + consonants not followed by virama
    independent_vowels = len(re.findall(r"[\u0905-\u0914\u0960-\u0961]", text))
    full_consonants = len(re.findall(r"[\u0915-\u0939\u0958-\u095F](?![\u094D])", text))
    return independent_vowels + full_consonants


def count_syllables(word: str) -> int:
    """Universal syllable counter supporting Latin and Devanagari / Indic scripts."""
    # Check if text contains Devanagari
    if re.search(r"[\u0900-\u097F]", word):
        return count_syllables_devanagari(word)
    return count_syllables_english(word)


def analyze_syllable_pattern(lines: List[str]) -> List[int]:
    """Calculates the syllable count for each line of text across languages."""
    pattern: List[int] = []
    for line in lines:
        if not line.strip():
            continue
        if re.search(r"[\u0900-\u097F]", line):
            pattern.append(count_syllables_devanagari(line))
        else:
            words = re.findall(r"\b[A-Za-z']+\b", line)
            line_syllables = sum(count_syllables_english(w) for w in words)
            pattern.append(line_syllables)
    return pattern


def get_rhyme_ending(word: str) -> str:
    """Extracts phonetic rhyme ending supporting English and Devanagari."""
    word = word.strip()
    if not word:
        return ""

    # Devanagari Rhyme (यमक) extraction: extract last 1-2 aksharas including matras
    if re.search(r"[\u0900-\u097F]", word):
        clean_dev = re.sub(r"[^\u0900-\u097F]", "", word)
        # Take the last consonant/vowel cluster
        match = re.search(r"([\u0915-\u0939\u0905-\u0914]?[\u093E-\u094C\u0902\u0903]?)$", clean_dev)
        if match and match.group(1):
            return match.group(1)
        return clean_dev[-2:] if len(clean_dev) >= 2 else clean_dev

    word = re.sub(r"[^a-z]", "", word.lower())
    if not word:
        return ""

    # Common phonetic equivalences
    phonetic_rules = [
        (r"(?:igh|y|ie|ye|eye)$", "ai"),
        (r"(?:ight|ite)$", "ait"),
        (r"(?:ar|are)$", "ar"),
        (r"(?:ay|ai|ey|eigh)$", "ei"),
        (r"(?:ee|ea|ie)$", "ee"),
        (r"(?:ow|oe|oa)$", "oh"),
        (r"(?:oo|ue|ew)$", "oo"),
        (r"(?:ound|owned)$", "ound"),
        (r"(?:tion|sion)$", "shun"),
    ]
    for pattern, sound in phonetic_rules:
        if re.search(pattern, word):
            return sound

    # Strip trailing silent 'e'
    if len(word) > 3 and word.endswith("e") and not word.endswith(("ee", "ye", "oe")):
        word = word[:-1]

    # Find last vowel sequence
    vowels = "aeiouy"
    last_vowel_idx = -1
    for i in range(len(word) - 1, -1, -1):
        if word[i] in vowels:
            last_vowel_idx = i
            break
    if last_vowel_idx == -1:
        return word[-2:] if len(word) >= 2 else word

    # Include any contiguous vowels before it
    start_vowel = last_vowel_idx
    while start_vowel > 0 and word[start_vowel - 1] in vowels:
        start_vowel -= 1
    return word[start_vowel:]


def detect_rhyme_scheme(lines: List[str]) -> Dict[str, Any]:
    """Detects rhyme scheme (e.g., AABB, ABAB, ABCB) from line-end words."""
    cleaned_lines = [l.strip() for l in lines if l.strip()]
    if len(cleaned_lines) < 2:
        return {"scheme": "N/A", "confidence": 0.0, "pairs": []}

    end_words = []
    for line in cleaned_lines:
        words = re.findall(r"\b[A-Za-z']+\b", line)
        end_words.append(words[-1].lower() if words else "")

    rhyme_keys = [get_rhyme_ending(w) for w in end_words]
    # Assign letters A, B, C...
    scheme_letters: List[str] = []
    assigned: Dict[str, str] = {}
    current_char_code = 65  # 'A'

    for r_key in rhyme_keys:
        if not r_key:
            scheme_letters.append("X")
            continue
        if r_key not in assigned:
            assigned[r_key] = chr(current_char_code)
            current_char_code += 1
        scheme_letters.append(assigned[r_key])

    scheme_str = "".join(scheme_letters[:8])  # First 8 lines pattern
    return {
        "scheme": scheme_str,
        "end_words": end_words[:8],
        "rhyme_groups": assigned,
    }


def detect_repeated_phrases(lines: List[str], min_length: int = 3, min_occurrences: int = 2) -> List[Dict[str, Any]]:
    """Identifies repeating hooks, choruses, or lyrical motifs."""
    phrases = []
    for line in lines:
        cleaned = re.sub(r"[^\w\s]", "", line.lower()).strip()
        words = cleaned.split()
        if len(words) >= min_length:
            for i in range(len(words) - min_length + 1):
                phrase = " ".join(words[i : i + min_length])
                phrases.append(phrase)

    counts = Counter(phrases)
    results = []
    for phrase, count in counts.most_common(10):
        if count >= min_occurrences:
            results.append({"phrase": phrase, "count": count})
    return results


def parse_lyric_sections(raw_lyrics: str) -> List[Dict[str, Any]]:
    """Segments raw lyrics into structured verse, chorus, bridge, intro, and outro blocks."""
    if not raw_lyrics:
        return []

    lines = raw_lyrics.splitlines()
    sections: List[Dict[str, Any]] = []
    current_type = "verse"
    current_lines: List[str] = []
    section_index = 1

    header_pattern = re.compile(
        r"^\[?\s*(verse|chorus|pre-chorus|bridge|intro|outro|hook|refrain)(?:\s*(\d+))?\s*\]?:?",
        re.IGNORECASE,
    )

    for line in lines:
        stripped = line.strip()
        match = header_pattern.match(stripped)
        if match:
            # Commit preceding section if non-empty
            if current_lines:
                sections.append({
                    "type": current_type,
                    "index": section_index,
                    "lines": [l for l in current_lines if l.strip()],
                })
                section_index += 1
                current_lines = []

            tag = match.group(1).lower()
            if tag in ("hook", "refrain"):
                tag = "chorus"
            current_type = tag
        elif stripped == "" and current_lines:
            # Empty line can signify stanza break if no headers are present
            pass
            current_lines.append(line)
        else:
            if stripped:
                current_lines.append(stripped)

    if current_lines:
        sections.append({
            "type": current_type,
            "index": section_index,
            "lines": [l for l in current_lines if l.strip()],
        })

    return sections
