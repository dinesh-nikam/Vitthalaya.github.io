"""Health check and platform telemetry routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from api.deps import get_db

router = APIRouter(prefix="/health", tags=["Health & System"])


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Validates operational readiness of API and Database."""
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {exc}"

    return {
        "status": "online",
        "service": "Music Intelligence Platform",
        "version": "1.0.0",
        "database": db_status,
        "scrapling_fetcher": "ready",
    }
