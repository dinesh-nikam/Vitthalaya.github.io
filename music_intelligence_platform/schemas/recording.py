"""Pydantic schemas for Audio Recording entities."""

from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class RecordingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    composition_id: Optional[str] = None
    artist_id: Optional[str] = None
    isrc: Optional[str] = Field(None, max_length=50, description="International Standard Recording Code")
    duration_seconds: Optional[int] = Field(None, ge=1, le=86400)
    release_date: Optional[str] = Field(None, max_length=50)
    album_title: Optional[str] = Field(None, max_length=255)
    record_label: Optional[str] = Field(None, max_length=255)
    audio_format: str = Field("MP3", max_length=50)
    audio_url: Optional[str] = Field(None, max_length=512)
    performer_credits: List[Dict[str, Any]] = Field(default_factory=list)
    producer_credits: List[Dict[str, Any]] = Field(default_factory=list)


class RecordingCreate(RecordingBase):
    pass


class RecordingResponse(RecordingBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
