"""Source Registry and Scraping Audit routes."""

from typing import List
from fastapi import APIRouter
from core.database import async_session_scope
from discovery.source_registry import source_registry
from models.domain import ScrapingHistory
from sqlalchemy import desc, select

router = APIRouter(prefix="/sources", tags=["Source Registry & Compliance"])


@router.get("")
async def list_sources():
    """Lists configured authoritative sources, rate limits, and permitted content categories."""
    sources = []
    for s in source_registry.list_sources():
        sources.append({
            "id": s.id,
            "name": s.name,
            "base_url": s.base_url,
            "source_type": s.source_type,
            "authority_score": s.authority_score,
            "rate_limit_per_second": s.rate_limit_per_second,
            "requires_js": s.requires_js,
            "permitted_content": list(s.permitted_content),
        })
    return {"total": len(sources), "sources": sources}


@router.get("/history")
async def get_scraping_history(limit: int = 50):
    """Retrieves recent scraping history logs for audit and traceability."""
    async with async_session_scope() as session:
        stmt = select(ScrapingHistory).order_by(desc(ScrapingHistory.retrieved_at)).limit(limit)
        res = await session.execute(stmt)
        entries = res.scalars().all()

        return [
            {
                "id": e.id,
                "url": e.url,
                "status": e.status,
                "http_status": e.http_status,
                "fetcher_used": e.fetcher_used,
                "execution_time_seconds": round(e.execution_time_seconds, 3),
                "error_message": e.error_message,
                "retrieved_at": e.retrieved_at.isoformat() if e.retrieved_at else None,
            }
            for e in entries
        ]
