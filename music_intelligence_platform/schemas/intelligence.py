"""Pydantic schemas for Music Intelligence, Entity Resolution, and Analysis."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class EntityResolutionRequest(BaseModel):
    title: str = Field(..., min_length=1)
    artist_name: Optional[str] = None
    isrc: Optional[str] = None
    iswc: Optional[str] = None
    first_line: Optional[str] = None
    language: Optional[str] = None


class ResolvedEntity(BaseModel):
    entity_id: str
    entity_type: str  # "composition", "recording", "artist"
    title: str
    primary_artist: Optional[str]
    confidence_score: float  # 0.0 to 1.0
    matching_criteria: List[str]  # e.g. ["isrc_exact", "title_fuzzy", "incipit_match"]
    sources_confirmed: List[str]  # e.g. ["musicbrainz", "discogs"]


class EntityResolutionResponse(BaseModel):
    query: EntityResolutionRequest
    matches: List[ResolvedEntity]
    best_match: Optional[ResolvedEntity] = None
    status: str  # "EXACT_MATCH", "FUZZY_MATCH", "UNRESOLVED"


class MusicologicalProfile(BaseModel):
    raga_or_scale: Optional[str] = None
    thaat: Optional[str] = None
    meter: Optional[str] = None
    tempo_bpm_range: Optional[str] = None
    traditional_taal: Optional[str] = None  # e.g., "Bhajani Taal", "Dadra", "Teentaal"
    primary_rasa: Optional[str] = None  # e.g., "Shanta", "Bhakti", "Karuna", "Adbhut"
    instruments_suggested: List[str] = Field(default_factory=list)
    thematic_cluster: List[str] = Field(default_factory=list)
