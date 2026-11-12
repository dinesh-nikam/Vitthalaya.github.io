"""Schemas package initialization and re-exports."""

from schemas.artist import ArtistBase, ArtistCreate, ArtistUpdate, ArtistResponse
from schemas.composition import (
    CompositionBase,
    CompositionCreate,
    CompositionUpdate,
    CompositionResponse,
)
from schemas.recording import RecordingBase, RecordingCreate, RecordingResponse
from schemas.lyrics import (
    VerseSegment,
    LyricsBase,
    LyricsCreate,
    LyricsResponse,
    LyricsAnalysisResponse,
)
from schemas.crawl import SourceRegistryItem, CrawlJobRequest, CrawlJobResponse
from schemas.intelligence import (
    EntityResolutionRequest,
    ResolvedEntity,
    EntityResolutionResponse,
    MusicologicalProfile,
)

__all__ = [
    "ArtistBase",
    "ArtistCreate",
    "ArtistUpdate",
    "ArtistResponse",
    "CompositionBase",
    "CompositionCreate",
    "CompositionUpdate",
    "CompositionResponse",
    "RecordingBase",
    "RecordingCreate",
    "RecordingResponse",
    "VerseSegment",
    "LyricsBase",
    "LyricsCreate",
    "LyricsResponse",
    "LyricsAnalysisResponse",
    "SourceRegistryItem",
    "CrawlJobRequest",
    "CrawlJobResponse",
    "EntityResolutionRequest",
    "ResolvedEntity",
    "EntityResolutionResponse",
    "MusicologicalProfile",
]
