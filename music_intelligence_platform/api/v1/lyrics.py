"""Lyrics and sacred verse routes with integrated computational analysis."""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from models.lyrics import Lyrics
from schemas.lyrics import LyricsCreate, LyricsResponse, LyricsAnalysisResponse
from services.music_analyzer import music_analyzer

router = APIRouter(prefix="/lyrics", tags=["Lyrics & Verse Analysis"])


@router.get("/{composition_id}", response_model=LyricsResponse)
async def get_lyrics_for_composition(composition_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Lyrics).where(Lyrics.composition_id == composition_id)
    res = await db.execute(stmt)
    lyrics = res.scalars().first()
    if not lyrics:
        raise HTTPException(status_code=404, detail="Lyrics not found for composition")
    return lyrics


@router.post("", response_model=LyricsResponse, status_code=201)
async def create_lyrics(payload: LyricsCreate, db: AsyncSession = Depends(get_db)):
    # Run automatic computational analysis if segments are empty
    verse_segments = payload.verse_segments
    meter = payload.meter_analysis
    rhyme = payload.rhyme_scheme

    if not verse_segments or not meter:
        analysis = music_analyzer.analyze_lyrics(payload.full_text)
        verse_segments = analysis.verse_segments
        meter = analysis.meter
        rhyme = analysis.rhyme_scheme

    data = payload.model_dump()
    data["verse_segments"] = [s.model_dump() for s in verse_segments]
    data["meter_analysis"] = meter
    data["rhyme_scheme"] = rhyme

    lyrics = Lyrics(**data)
    db.add(lyrics)
    await db.commit()
    await db.refresh(lyrics)
    return lyrics


@router.post("/analyze", response_model=LyricsAnalysisResponse)
async def analyze_raw_lyrics(text: str = Body(..., embed=True, description="Raw text of lyrics to analyze")):
    """Performs real-time NLP/meter/rhyme analysis on provided lyrics text."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Lyrics text cannot be empty")
    return music_analyzer.analyze_lyrics(text)
