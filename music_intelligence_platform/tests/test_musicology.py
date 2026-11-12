"""Tests for musicological analysis, poetics, confidence engine, and entity deduplication."""

import pytest
from discovery.deduplication import clean_song_title, is_same_song, levenshtein_similarity, normalize_string
from musicology.analyzer import (
    classify_tempo,
    compute_roman_numerals,
    estimate_key_from_chords,
    parse_chord_root_and_quality,
)
from musicology.confidence_engine import FieldObservation, confidence_engine
from musicology.poetics import (
    analyze_syllable_pattern,
    count_syllables_english,
    detect_repeated_phrases,
    detect_rhyme_scheme,
    parse_lyric_sections,
)


def test_musicology_chords_and_roman():
    chords = ["C", "G", "Am", "F"]
    roman = compute_roman_numerals(chords, "C Major")
    assert roman == ["I", "V", "vi", "IV"]


def test_musicology_key_estimation():
    chords = ["G", "Em", "C", "D"]
    est_key, confidence = estimate_key_from_chords(chords)
    assert est_key == "G Major"
    assert confidence > 0.70


def test_musicology_tempo_classification():
    assert "Andante" in classify_tempo(90)
    assert "Allegro" in classify_tempo(130)
    assert "Largo" in classify_tempo(50)


def test_poetics_syllables():
    assert count_syllables_english("hello") == 2
    assert count_syllables_english("rhapsody") == 3
    assert count_syllables_english("bohemian") >= 3

    lines = ["Is this the real life?", "Is this just fantasy?"]
    pattern = analyze_syllable_pattern(lines)
    assert len(pattern) == 2
    assert pattern[0] > 0


def test_poetics_rhyme_scheme():
    lines = [
        "Twinkle twinkle little star",
        "How I wonder what you are",
        "Up above the world so high",
        "Like a diamond in the sky",
    ]
    rhyme_info = detect_rhyme_scheme(lines)
    assert rhyme_info["scheme"] == "AABB"


def test_poetics_repeated_phrases():
    lines = [
        "carry on carry on",
        "nothing really matters",
        "nothing really matters to me",
        "nothing really matters",
    ]
    repeats = detect_repeated_phrases(lines, min_length=3, min_occurrences=2)
    assert any("nothing really matters" in r["phrase"] for r in repeats)


def test_confidence_engine_consensus():
    obs = [
        FieldObservation("Queen", "MusicBrainz", 0.95),
        FieldObservation("Queen", "Discogs", 0.90),
    ]
    val, conf, conflict = confidence_engine.resolve_field("artist", obs)
    assert val == "Queen"
    assert conf >= 0.98  # Consensus boost
    assert conflict is None


def test_confidence_engine_conflict():
    obs = [
        FieldObservation("1975-10-31", "MusicBrainz", 0.95),
        FieldObservation("1975-11-01", "RandomBlog", 0.60),
    ]
    val, conf, conflict = confidence_engine.resolve_field("release_date", obs)
    assert val == "1975-10-31"  # Picked higher authority
    assert conflict is not None
    assert conflict["field"] == "release_date"


def test_deduplication():
    assert clean_song_title("Bohemian Rhapsody (2011 Remaster)") == "Bohemian Rhapsody"
    assert clean_song_title("Yesterday - Live at Wembley / 1986") == "Yesterday"

    assert is_same_song(
        "Bohemian Rhapsody (Remastered 2021)", "Queen",
        "Bohemian Rhapsody", "Queen"
    ) is True

    # Same ISRC
    assert is_same_song(
        "Song A", "Artist 1",
        "Song Alternate Title", "Artist 1",
        isrc1="US1234567890", isrc2="US1234567890"
    ) is True
