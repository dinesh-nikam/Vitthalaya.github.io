"""Pydantic schemas for Lyrics and Stanza structures."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class VerseSegment(BaseModel):
    verse_number: int
    lines: List[str]
    stanza_type: str = "stanza"  # stanza, chorus, charan, dhrpad, refrain
    syllable_counts: Optional[List[int]] = None


class LyricsBase(BaseModel):
    composition_id: str
    language: str = Field("mr", max_length=20)
    script: str = Field("Deva", max_length=20)
    full_text: str = Field(..., min_length=1)
    verse_segments: List[VerseSegment] = Field(default_factory=list)
    rhyme_scheme: Optional[str] = Field(None, max_length=50)
    meter_analysis: Optional[str] = Field(None, max_length=100)
    translation: Optional[str] = None
    meaning_notes: Optional[str] = None
    is_public_domain: bool = False
    license_type: str = Field("Public Domain / Devotional Heritage", max_length=100)
    source_attribution: str = Field(..., max_length=255)
    source_url: Optional[str] = Field(None, max_length=512)


class LyricsCreate(LyricsBase):
    quality_score: float = Field(1.0, ge=0.0, le=1.0)
    verified: bool = False


class LyricsResponse(LyricsBase):
    id: str
    quality_score: float
    verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LyricsAnalysisResponse(BaseModel):
    total_verses: int
    total_lines: int
    total_words: int
    detected_language: str
    detected_script: str
    rhyme_scheme: Optional[str]
    meter: Optional[str]
    verse_segments: List[VerseSegment]
    sentiment_or_mood: Optional[str]
    thematic_tags: List[str]
