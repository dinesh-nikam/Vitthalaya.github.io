"""Models package initialization and re-exports."""

from core.database import Base
from models.domain import (
    Album,
    Artist,
    Composer,
    Genre,
    Instrument,
    Lyric,
    MusicalCharacteristic,
    Producer,
    RecordingCredit,
    ScrapingHistory,
    Song,
    Songwriter,
    Source,
)

__all__ = [
    "Base",
    "Artist",
    "Album",
    "Song",
    "Songwriter",
    "Composer",
    "Producer",
    "RecordingCredit",
    "Instrument",
    "Genre",
    "MusicalCharacteristic",
    "Lyric",
    "Source",
    "ScrapingHistory",
]
