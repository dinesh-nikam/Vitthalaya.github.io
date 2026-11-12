"""Intelligence, Entity Resolution, Musicological Profiling, and Data Export routes."""

from fastapi import APIRouter, Response, Body
from schemas.intelligence import (
    EntityResolutionRequest,
    EntityResolutionResponse,
    MusicologicalProfile,
)
from services.entity_resolver import entity_resolver
from services.music_analyzer import music_analyzer
from services.exporter import dataset_exporter

router = APIRouter(prefix="/intelligence", tags=["Music Intelligence & Analytics"])


@router.post("/resolve", response_model=EntityResolutionResponse)
async def resolve_musical_entity(req: EntityResolutionRequest):
    """Cross-references ISWC, ISRC, or fuzzy title against database to resolve ambiguous works."""
    return await entity_resolver.resolve(req)


@router.post("/profile", response_model=MusicologicalProfile)
async def generate_musicological_profile(
    title: str = Body(..., embed=True),
    text: str = Body(None, embed=True),
    raga_hint: str = Body(None, embed=True),
):
    """Produces a musicological profile with suggested raga, taal, rasa, and traditional instruments."""
    return music_analyzer.profile_composition(title=title, text=text, raga_hint=raga_hint)


@router.get("/export/json")
async def export_catalog_json():
    """Exports full catalog data as downloadable JSON."""
    content = await dataset_exporter.export_to_json()
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=catalog_export.json"},
    )


@router.get("/export/csv")
async def export_catalog_csv():
    """Exports full catalog data as downloadable CSV."""
    content = await dataset_exporter.export_to_csv()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=catalog_export.csv"},
    )


@router.get("/export/excel")
async def export_catalog_excel():
    """Exports full catalog data as downloadable OpenPyXL Excel workbook."""
    content = await dataset_exporter.export_to_excel()
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=catalog_export.xlsx"},
    )
