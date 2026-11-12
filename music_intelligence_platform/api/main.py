"""FastAPI application factory for Music Composition & Lyrics Intelligence Platform."""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from api.routes.compositions import router as compositions_router
from api.routes.exports import router as exports_router
from api.routes.health import router as health_router
from api.routes.scrape import router as scrape_router
from api.routes.search import router as search_router
from api.routes.sources import router as sources_router
from config.logging_config import logger
from config.settings import settings
from core.database import init_db

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: initializes database tables and resources on startup."""
    logger.info("Initializing database schema...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down Music Intelligence Platform.")


def create_app() -> FastAPI:
    """Builds and configures the FastAPI application instance."""
    app = FastAPI(
        title="Music Composition & Lyrics Intelligence Platform",
        description=(
            "Comprehensive musicological research and data extraction engine powered by "
            "Scrapling (https://github.com/D4Vinci/Scrapling). Collects, organizes, and structures "
            "publicly accessible information regarding songs, authorized lyrics, composition, "
            "songwriting, and acoustic characteristics."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    # Cross-Origin Resource Sharing (CORS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API Routers
    app.include_router(scrape_router, prefix="/api")
    app.include_router(search_router, prefix="/api")
    app.include_router(compositions_router, prefix="/api")
    app.include_router(exports_router, prefix="/api")
    app.include_router(sources_router, prefix="/api")
    app.include_router(health_router, prefix="/api")

    # Serve Interactive Dashboard Frontend
    if FRONTEND_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

        @app.get("/", response_class=HTMLResponse, tags=["Dashboard UI"])
        @app.get("/dashboard", response_class=HTMLResponse, tags=["Dashboard UI"])
        async def serve_dashboard():
            index_path = FRONTEND_DIR / "index.html"
            if index_path.exists():
                return FileResponse(index_path)
            return HTMLResponse("<h1>Music Intelligence Platform UI Loading...</h1>")

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host=settings.app_host, port=settings.app_port, reload=settings.debug)
