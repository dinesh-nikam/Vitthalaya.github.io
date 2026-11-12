"""Pydantic schemas for Artist entities."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ArtistBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Primary name of the artist or composer")
    name_translit: Optional[str] = Field(None, max_length=255, description="Latin transliteration of the name")
    disambiguation: Optional[str] = Field(None, max_length=255, description="Disambiguation comment (e.g. Marathi poet)")
    artist_type: str = Field("Person", description="Entity type: Person, Group, Saint, Composer, Traditional")
    country: Optional[str] = Field(None, max_length=100)
    period_active: Optional[str] = Field(None, max_length=100)
    biography: Optional[str] = Field(None)
    musicbrainz_id: Optional[str] = Field(None, max_length=100)
    discogs_id: Optional[str] = Field(None, max_length=100)
    allmusic_id: Optional[str] = Field(None, max_length=100)


class ArtistCreate(ArtistBase):
    authority_score: float = Field(0.8, ge=0.0, le=1.0)
    verified: bool = False


class ArtistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    name_translit: Optional[str] = None
    disambiguation: Optional[str] = None
    artist_type: Optional[str] = None
    country: Optional[str] = None
    period_active: Optional[str] = None
    biography: Optional[str] = None
    musicbrainz_id: Optional[str] = None
    discogs_id: Optional[str] = None
    allmusic_id: Optional[str] = None
    authority_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    verified: Optional[bool] = None


class ArtistResponse(ArtistBase):
    id: str
    authority_score: float
    verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
