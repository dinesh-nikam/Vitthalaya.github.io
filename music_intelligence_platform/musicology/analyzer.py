"""Musicological analysis engine: harmonic progression, Roman numerals, key estimation, and arrangement analysis."""

from collections import Counter
import re
from typing import Any, Dict, List, Optional, Tuple


# Chromatic scale pitch classes
PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_EQUIVALENTS = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}

# Scale intervals (semitones from root)
MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10]

# Standard Roman numerals for major and natural minor scales
MAJOR_ROMAN = ["I", "ii", "iii", "IV", "V", "vi", "vii°"]
MINOR_ROMAN = ["i", "ii°", "III", "iv", "v", "VI", "VII"]


def normalize_pitch(pitch: str) -> str:
    """Normalizes pitch note, converting flats to sharps."""
    clean = pitch.strip().capitalize()
    return FLAT_EQUIVALENTS.get(clean, clean)


def parse_chord_root_and_quality(chord: str) -> Tuple[str, str]:
    """Extracts root note and chord quality from chord symbol e.g., 'Am7' -> ('A', 'min')."""
    match = re.match(r"^([A-G][b#]?)(.*)$", chord.strip())
    if not match:
        return "", ""
    root = normalize_pitch(match.group(1))
    suffix = match.group(2).lower()

    if "m" in suffix and "maj" not in suffix:
        quality = "minor"
    elif "dim" in suffix or "°" in suffix:
        quality = "diminished"
    elif "aug" in suffix or "+" in suffix:
        quality = "augmented"
    else:
        quality = "major"
    return root, quality


def compute_roman_numerals(chords: List[str], key: str) -> List[str]:
    """Computes Roman numeral harmonic analysis for a sequence of chords given a key."""
    if not key or not chords:
        return []

    # Parse key
    key_match = re.match(r"^([A-G][b#]?)\s*(major|minor|m)?", key, re.IGNORECASE)
    if not key_match:
        return []

    root_note = normalize_pitch(key_match.group(1))
    mode = key_match.group(2) or "major"
    mode = "minor" if mode.lower() in ("m", "minor") else "major"

    if root_note not in PITCH_CLASSES:
        return []

    root_idx = PITCH_CLASSES.index(root_note)
    intervals = MINOR_INTERVALS if mode == "minor" else MAJOR_INTERVALS
    roman_set = MINOR_ROMAN if mode == "minor" else MAJOR_ROMAN

    scale_pitch_to_roman = {}
    for degree_idx, semitone in enumerate(intervals):
        pitch = PITCH_CLASSES[(root_idx + semitone) % 12]
        scale_pitch_to_roman[pitch] = roman_set[degree_idx]

    roman_analysis = []
    for chord in chords:
        c_root, c_quality = parse_chord_root_and_quality(chord)
        if c_root in scale_pitch_to_roman:
            base_roman = scale_pitch_to_roman[c_root]
            # Adjust case if quality differs from diatonic expectation
            if c_quality == "minor" and base_roman.isupper():
                base_roman = base_roman.lower()
            elif c_quality == "major" and base_roman.islower():
                base_roman = base_roman.upper()
            roman_analysis.append(base_roman)
        else:
            # Non-diatonic / borrowed chord
            roman_analysis.append(f"?({chord})")

    return roman_analysis


def estimate_key_from_chords(chords: List[str]) -> Tuple[Optional[str], float]:
    """Algorithmically estimates the most probable musical key from chord progression."""
    if not chords:
        return None, 0.0

    roots = [parse_chord_root_and_quality(c)[0] for c in chords if c]
    if not roots:
        return None, 0.0

    counts = Counter(roots)
    first_chord_root = roots[0]
    last_chord_root = roots[-1]

    # Candidate keys evaluation
    best_key = None
    best_score = -1.0

    for candidate_root in PITCH_CLASSES:
        for mode, intervals in [("Major", MAJOR_INTERVALS), ("Minor", MINOR_INTERVALS)]:
            cand_idx = PITCH_CLASSES.index(candidate_root)
            diatonic_pitches = {PITCH_CLASSES[(cand_idx + semi) % 12] for semi in intervals}

            # Score how many chords in the progression belong to this diatonic scale
            in_scale = sum(counts[r] for r in roots if r in diatonic_pitches)
            total = len(roots)
            score = (in_scale / total) * 0.7

            # Bonus if first or last chord is tonic root
            if first_chord_root == candidate_root:
                score += 0.20
            if last_chord_root == candidate_root:
                score += 0.10

            if score > best_score:
                best_score = score
                best_key = f"{candidate_root} {mode}"

    return best_key, min(1.0, round(best_score, 2))


def classify_tempo(bpm: Optional[float]) -> str:
    """Returns traditional musicological tempo marking for BPM."""
    if bpm is None:
        return "Unknown"
    if bpm < 60:
        return "Largo (Broad, Slow)"
    elif bpm < 76:
        return "Adagio (Slow, Expressive)"
    elif bpm < 108:
        return "Andante (Walking Pace)"
    elif bpm < 120:
        return "Moderato (Moderate)"
    elif bpm < 156:
        return "Allegro (Fast, Bright)"
    elif bpm < 200:
        return "Vivace / Presto (Very Fast)"
    else:
        return "Prestissimo (Extremely Fast)"
