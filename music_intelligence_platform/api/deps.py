"""FastAPI route dependencies and injection utilities."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing transactional asynchronous database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
