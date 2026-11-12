"""Artist & Composer catalog management routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from models.artist import Artist
from schemas.artist import ArtistCreate, ArtistUpdate, ArtistResponse

router = APIRouter(prefix="/artists", tags=["Artists & Composers"])


@router.get("", response_model=List[ArtistResponse])
async def list_artists(
    query: Optional[str] = Query(None, description="Search by artist or composer name"),
    artist_type: Optional[str] = Query(None, description="Filter by artist type (Person, Group, Saint, Composer)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Artist)
    if query:
        stmt = stmt.where(Artist.name.ilike(f"%{query}%"))
    if artist_type:
        stmt = stmt.where(Artist.artist_type == artist_type)
    stmt = stmt.offset(skip).limit(limit)

    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{artist_id}", response_model=ArtistResponse)
async def get_artist(artist_id: str, db: AsyncSession = Depends(get_db)):
    artist = await db.get(Artist, artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    return artist


@router.post("", response_model=ArtistResponse, status_code=201)
async def create_artist(payload: ArtistCreate, db: AsyncSession = Depends(get_db)):
    artist = Artist(**payload.model_dump())
    db.add(artist)
    await db.commit()
    await db.refresh(artist)
    return artist


@router.put("/{artist_id}", response_model=ArtistResponse)
async def update_artist(artist_id: str, payload: ArtistUpdate, db: AsyncSession = Depends(get_db)):
    artist = await db.get(Artist, artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(artist, field, val)

    await db.commit()
    await db.refresh(artist)
    return artist
