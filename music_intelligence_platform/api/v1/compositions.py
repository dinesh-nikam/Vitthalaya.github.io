"""Composition and Musical Work routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from models.composition import Composition
from schemas.composition import CompositionCreate, CompositionUpdate, CompositionResponse

router = APIRouter(prefix="/compositions", tags=["Compositions & Musical Works"])


@router.get("", response_model=List[CompositionResponse])
async def list_compositions(
    query: Optional[str] = Query(None, description="Search by title or incipit"),
    work_type: Optional[str] = Query(None, description="Filter: Song, Abhang, Bhajan, Aarti, Classical"),
    raga: Optional[str] = Query(None, description="Filter by raga or scale"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Composition)
    if query:
        stmt = stmt.where(
            (Composition.title.ilike(f"%{query}%")) | 
            (Composition.title_native.ilike(f"%{query}%"))
        )
    if work_type:
        stmt = stmt.where(Composition.work_type == work_type)
    if raga:
        stmt = stmt.where(Composition.raga_or_scale.ilike(f"%{raga}%"))

    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{composition_id}", response_model=CompositionResponse)
async def get_composition(composition_id: str, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Composition, composition_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Composition not found")
    return comp


@router.post("", response_model=CompositionResponse, status_code=201)
async def create_composition(payload: CompositionCreate, db: AsyncSession = Depends(get_db)):
    comp = Composition(**payload.model_dump())
    db.add(comp)
    await db.commit()
    await db.refresh(comp)
    return comp


@router.put("/{composition_id}", response_model=CompositionResponse)
async def update_composition(composition_id: str, payload: CompositionUpdate, db: AsyncSession = Depends(get_db)):
    comp = await db.get(Composition, composition_id)
    if not comp:
        raise HTTPException(status_code=404, detail="Composition not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(comp, field, val)

    await db.commit()
    await db.refresh(comp)
    return comp
