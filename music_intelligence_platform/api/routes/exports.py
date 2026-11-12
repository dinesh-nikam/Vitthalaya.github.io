"""Export routes for JSON, CSV, and Excel downloads."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import PlainTextResponse, StreamingResponse
from models.schemas import SongSearchFilter
from services.export_service import export_service
from services.music_service import music_service

router = APIRouter(prefix="/exports", tags=["Export & Data Delivery"])


@router.get("/download")
async def download_catalog(
    format: str = Query("json", pattern="^(json|csv|excel)$", description="Export file format"),
    query: Optional[str] = None,
    artist: Optional[str] = None,
    genre: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
):
    """Generates structured export of research results in JSON, CSV, or formatted Excel."""
    filters = SongSearchFilter(query=query, artist=artist, genre=genre, limit=limit, offset=0)
    search_res = await music_service.search_songs(filters)

    # Collect full intelligence records
    items = []
    for item_meta in search_res["items"]:
        intel = await music_service.get_song_intelligence(item_meta["id"])
        if intel:
            items.append(intel)

    if not items:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No songs matched the export criteria."
        )

    if format == "json":
        json_content = export_service.to_json(items)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=music_intelligence_export.json"}
        )
    elif format == "csv":
        csv_content = export_service.to_csv(items)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=music_intelligence_export.csv"}
        )
    elif format == "excel":
        excel_bytes = export_service.to_excel_bytes(items)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=music_intelligence_export.xlsx"}
        )
