"""Pydantic schemas for Composition and Musical Work entities."""

from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class CompositionBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Main title in transliterated or primary script")
    title_native: Optional[str] = Field(None, max_length=255, description="Title in native script (e.g. Devanagari)")
    alternate_titles: List[str] = Field(default_factory=list, description="Alternate titles, incipits, or gatha numbers")
    work_type: str = Field("Song", description="Classification: Song, Abhang, Bhajan, Aarti, Stotra, Classical")
    iswc: Optional[str] = Field(None, max_length=50, description="International Standard Musical Work Code")
    musical_key: Optional[str] = Field(None, max_length=50)
    raga_or_scale: Optional[str] = Field(None, max_length=100)
    meter: Optional[str] = Field(None, max_length=100)
    tempo_bpm: Optional[int] = Field(None, ge=20, le=400)
    mood: Optional[str] = Field(None, max_length=100)
    themes: List[str] = Field(default_factory=list)
    composer_credits: List[Dict[str, Any]] = Field(default_factory=list)
    lyricist_credits: List[Dict[str, Any]] = Field(default_factory=list)
    publishing_rights: Optional[str] = Field(None, max_length=255)
    primary_artist_id: Optional[str] = None


class CompositionCreate(CompositionBase):
    authority_score: float = Field(0.85, ge=0.0, le=1.0)
    verified: bool = False


class CompositionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    title_native: Optional[str] = None
    alternate_titles: Optional[List[str]] = None
    work_type: Optional[str] = None
    iswc: Optional[str] = None
    musical_key: Optional[str] = None
    raga_or_scale: Optional[str] = None
    meter: Optional[str] = None
    tempo_bpm: Optional[int] = None
    mood: Optional[str] = None
    themes: Optional[List[str]] = None
    composer_credits: Optional[List[Dict[str, Any]]] = None
    lyricist_credits: Optional[List[Dict[str, Any]]] = None
    publishing_rights: Optional[str] = None
    primary_artist_id: Optional[str] = None
    authority_score: Optional[float] = None
    verified: Optional[bool] = None


class CompositionResponse(CompositionBase):
    id: str
    authority_score: float
    verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
