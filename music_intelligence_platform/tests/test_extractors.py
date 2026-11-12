"""Tests for all 5 intelligence category extractors."""

import pytest
from discovery.source_registry import source_registry
from extractors.artist_extractor import ArtistIntelligenceExtractor
from extractors.composition_extractor import CompositionExtractor
from extractors.lyrics_extractor import LyricsExtractor
from extractors.metadata_extractor import SongMetadataExtractor
from extractors.production_extractor import ProductionExtractor
from scrapling_engine.fetcher_manager import ScrapedResponse


def test_metadata_extractor(mock_scraped_response):
    extractor = SongMetadataExtractor()
    mb_def = source_registry.get("musicbrainz")
    result = extractor.extract(mock_scraped_response, mb_def)

    assert result.category == "basic_metadata"
    data = result.data
    assert data["title"] == "Bohemian Rhapsody"
    assert data["artist"] == "Queen"
    assert data["album"] == "A Night at the Opera"
    assert data["release_date"] == "1975-10-31"
    assert data["duration"] == "5:55"
    assert data["duration_seconds"] == 355
    assert data["isrc"] == "GBUM71029604"
    assert result.confidence_score > 0.85


def test_lyrics_extractor_authorized(mock_scraped_response):
    extractor = LyricsExtractor()
    # ChoralWiki or Genius permits authorized/public domain lyrics
    cpdl_def = source_registry.get("choralwiki")
    result = extractor.extract(mock_scraped_response, cpdl_def)

    assert result.category == "lyrics_and_songwriting"
    lyrics_data = result.data["lyrics"]
    assert lyrics_data["availability"] == "public_domain"
    assert len(lyrics_data["sections"]) >= 3

    # Check songwriting credits
    sw_data = result.data["songwriting"]
    assert "Freddie Mercury" in sw_data["writers"]
    assert "Freddie Mercury" in sw_data["composers"]


def test_lyrics_extractor_unauthorized(mock_scraped_response):
    extractor = LyricsExtractor()
    # Source without lyrics permission
    mb_def = source_registry.get("musicbrainz")
    result = extractor.extract(mock_scraped_response, mb_def)

    lyrics_data = result.data["lyrics"]
    assert lyrics_data["availability"] == "not_authorized"
    # Songwriting credits are still preserved as permitted factual metadata
    assert "Freddie Mercury" in result.data["songwriting"]["writers"]


def test_composition_extractor(mock_scraped_response):
    extractor = CompositionExtractor()
    chordify_def = source_registry.get("chordify")
    result = extractor.extract(mock_scraped_response, chordify_def)

    assert result.category == "musical_composition"
    comp = result.data["composition"]
    assert comp["key"] == "Bb Major"
    assert comp["bpm"] == 72.0
    assert "Bb" in comp["chord_progression"]
    assert "Gm" in comp["chord_progression"]
    assert comp["is_estimated"] is False
    assert result.confidence_score >= 0.90


def test_production_extractor(mock_scraped_response):
    extractor = ProductionExtractor()
    discogs_def = source_registry.get("discogs")
    result = extractor.extract(mock_scraped_response, discogs_def)

    assert result.category == "production_and_recording"
    prod = result.data["production"]
    assert any("Roy Thomas Baker" in p for p in prod["producer"])
    assert any("Rockfield Studios" in s for s in prod["recording_studio"])
