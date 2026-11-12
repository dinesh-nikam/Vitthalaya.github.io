"""Audio Recording and Track release routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from models.recording import Recording
from schemas.recording import RecordingCreate, RecordingResponse

router = APIRouter(prefix="/recordings", tags=["Recordings & Audio Releases"])


@router.get("", response_model=List[RecordingResponse])
async def list_recordings(
    isrc: Optional[str] = Query(None, description="Lookup by International Standard Recording Code"),
    composition_id: Optional[str] = Query(None, description="Filter by composition ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Recording)
    if isrc:
        stmt = stmt.where(Recording.isrc == isrc.strip())
    if composition_id:
        stmt = stmt.where(Recording.composition_id == composition_id)

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    rec = await db.get(Recording, recording_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")
    return rec


@router.post("", response_model=RecordingResponse, status_code=201)
async def create_recording(payload: RecordingCreate, db: AsyncSession = Depends(get_db)):
    rec = Recording(**payload.model_dump())
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec
