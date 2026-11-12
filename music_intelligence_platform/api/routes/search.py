"""Search and filtering API routes."""

from typing import Optional
from fastapi import APIRouter, Query
from models.schemas import SongSearchFilter
from services.music_service import music_service

router = APIRouter(prefix="/search", tags=["Search & Discovery"])


@router.get("/songs")
async def search_songs(
    query: Optional[str] = Query(None, description="Keywords for title or artist"),
    artist: Optional[str] = Query(None, description="Filter by artist name"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    key: Optional[str] = Query(None, description="Filter by musical key e.g. C Major"),
    min_bpm: Optional[float] = Query(None, description="Minimum tempo BPM"),
    max_bpm: Optional[float] = Query(None, description="Maximum tempo BPM"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Searches indexed songs with faceted musicological filtering."""
    filters = SongSearchFilter(
        query=query,
        artist=artist,
        genre=genre,
        key=key,
        min_bpm=min_bpm,
        max_bpm=max_bpm,
        limit=limit,
        offset=offset,
    )
    return await music_service.search_songs(filters)
