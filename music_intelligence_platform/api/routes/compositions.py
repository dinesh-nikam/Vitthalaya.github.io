"""Composition and detailed song intelligence API routes."""

from fastapi import APIRouter, HTTPException, status
from models.schemas import SongIntelligenceResponse
from services.music_service import music_service

router = APIRouter(prefix="/compositions", tags=["Compositions & Intelligence"])


@router.get("/{song_id}", response_model=SongIntelligenceResponse)
async def get_composition(song_id: int):
    """Retrieves full song intelligence, musical characteristics, poetics, and credits."""
    intelligence = await music_service.get_song_intelligence(song_id)
    if not intelligence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Composition with ID {song_id} not found."
        )
    return intelligence
