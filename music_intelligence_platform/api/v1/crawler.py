"""Crawler and extraction control routes."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db
from engine.crawler_service import crawler_service
from models.source import CrawlAuditLog
from schemas.crawl import CrawlJobRequest, CrawlJobResponse, SourceRegistryItem

router = APIRouter(prefix="/crawler", tags=["Crawler & Extraction Engine"])


@router.get("/sources", response_model=List[SourceRegistryItem])
async def list_sources():
    """Returns all registered authoritative crawl sources with authority and delay configs."""
    registry = crawler_service.get_sources_registry()
    return list(registry.values())


@router.post("/job", response_model=CrawlJobResponse)
async def run_crawl_job(req: CrawlJobRequest):
    """Executes a single compliant crawl and extraction job."""
    return await crawler_service.execute_crawl_job(req)


@router.get("/audit")
async def list_crawl_audit_logs(
    source_id: str = Query(None, description="Filter logs by source ID"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves recent crawl audit history with hash verification."""
    stmt = select(CrawlAuditLog).order_by(desc(CrawlAuditLog.created_at)).limit(limit)
    if source_id:
        stmt = stmt.where(CrawlAuditLog.source_id == source_id)
    res = await db.execute(stmt)
    return res.scalars().all()
