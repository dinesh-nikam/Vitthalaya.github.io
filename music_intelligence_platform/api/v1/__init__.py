"""API v1 routers bundle."""

from fastapi import APIRouter
from api.v1.health import router as health_router
from api.v1.artists import router as artists_router
from api.v1.compositions import router as compositions_router
from api.v1.recordings import router as recordings_router
from api.v1.lyrics import router as lyrics_router
from api.v1.crawler import router as crawler_router
from api.v1.intelligence import router as intelligence_router

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(health_router)
api_v1_router.include_router(artists_router)
api_v1_router.include_router(compositions_router)
api_v1_router.include_router(recordings_router)
api_v1_router.include_router(lyrics_router)
api_v1_router.include_router(crawler_router)
api_v1_router.include_router(intelligence_router)

__all__ = ["api_v1_router"]
