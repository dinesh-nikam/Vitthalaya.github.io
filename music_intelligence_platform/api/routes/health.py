"""Health check and platform diagnostic routes."""

from datetime import datetime, timezone
from fastapi import APIRouter
from core.database import async_session_scope
from sqlalchemy import text

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])


@router.get("")
async def health_check():
    """Returns application health, database connectivity status, and server time."""
    db_status = "healthy"
    try:
        async with async_session_scope() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "scrapling_engine": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }
