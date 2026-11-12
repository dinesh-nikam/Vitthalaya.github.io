"""Tests for JSON, CSV, and Excel export generation."""

import io
import openpyxl
import pandas as pd
import pytest
from models.schemas import (
    CompositionSchema,
    LyricsSchema,
    ProductionSchema,
    SongIntelligenceResponse,
    SongMetadataSchema,
    SongwritingSchema,
)
from services.export_service import export_service


@pytest.fixture
def sample_song_intelligence():
    return SongIntelligenceResponse(
        song=SongMetadataSchema(
            title="Bohemian Rhapsody",
            artist="Queen",
            album="A Night at the Opera",
            release_date="1975-10-31",
            genre="Progressive Rock",
            duration="5:55",
            language="en",
            isrc="GBUM71029604",
        ),
        songwriting=SongwritingSchema(
            writers=["Freddie Mercury"],
            composers=["Freddie Mercury"],
            lyricists=["Freddie Mercury"],
        ),
        composition=CompositionSchema(
            key="Bb Major",
            scale_type="Major",
            bpm=72.0,
            time_signature="4/4",
            chord_progression=["Bb", "Gm", "Cm7", "F7"],
            structure=["Intro", "Verse 1", "Chorus", "Outro"],
        ),
        production=ProductionSchema(
            producer=["Roy Thomas Baker", "Queen"],
            recording_studio=["Rockfield Studios"],
        ),
        lyrics=LyricsSchema(
            availability="public_domain",
            sections=[],
        ),
        confidence={"title": 0.99, "artist": 0.99, "key": 0.95},
    )


def test_export_json(sample_song_intelligence):
    json_str = export_service.to_json([sample_song_intelligence])
    assert "Bohemian Rhapsody" in json_str
    assert "Queen" in json_str
    assert "GBUM71029604" in json_str


def test_export_csv(sample_song_intelligence):
    csv_str = export_service.to_csv([sample_song_intelligence])
    assert "Title,Artist,Album" in csv_str
    assert "Bohemian Rhapsody" in csv_str
    assert "Freddie Mercury" in csv_str


def test_export_excel(sample_song_intelligence):
    excel_bytes = export_service.to_excel_bytes([sample_song_intelligence])
    assert len(excel_bytes) > 0

    # Parse with openpyxl to verify sheets
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    sheet_names = wb.sheetnames
    assert "Song Intelligence" in sheet_names
    assert "Composition & Chords" in sheet_names
    assert "Credits & Production" in sheet_names

    ws = wb["Song Intelligence"]
    assert ws["A2"].value == "Bohemian Rhapsody"
    assert ws["B2"].value == "Queen"
