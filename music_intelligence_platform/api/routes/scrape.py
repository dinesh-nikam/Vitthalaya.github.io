"""Scraping and extraction API endpoints."""

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from models.schemas import (
    BatchSongScrapeRequest,
    DiscographyCrawlRequest,
    SingleSongScrapeRequest,
    SongIntelligenceResponse,
)
from pipeline.batch_processor import batch_processor
from pipeline.orchestrator import music_pipeline
from scrapling_engine.spiders.discography_spider import DiscographySpider

router = APIRouter(prefix="/scrape", tags=["Scraping & Intelligence"])


@router.post("/song", response_model=SongIntelligenceResponse, status_code=status.HTTP_200_OK)
async def scrape_song(request: SingleSongScrapeRequest):
    """Executes full 9-step research and extraction pipeline for a single song entity."""
    try:
        result = await music_pipeline.execute(request)
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline extraction failed: {str(exc)}"
        )


@router.post("/batch", status_code=status.HTTP_202_ACCEPTED)
async def scrape_batch(request: BatchSongScrapeRequest):
    """Submits a concurrent batch scraping job across multiple songs or artists."""
    job_id = await batch_processor.submit_batch(request)
    return {
        "job_id": job_id,
        "status": "queued",
        "total_songs": len(request.songs),
        "concurrency": request.concurrency,
        "check_status_url": f"/api/scrape/batch/{job_id}",
    }


@router.get("/batch/{job_id}")
async def get_batch_status(job_id: str):
    """Retrieves execution status, progress, and results for a batch scrape job."""
    job = batch_processor.get_job(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Batch job {job_id} not found.")

    return {
        "job_id": job.job_id,
        "status": job.status,
        "total_items": job.total_items,
        "completed_items": job.completed_items,
        "failed_items": job.failed_items,
        "results": job.results,
        "errors": job.errors,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


@router.post("/discography")
async def crawl_discography(request: DiscographyCrawlRequest):
    """Crawls an artist's full discography and catalog using Scrapling Spider."""
    try:
        spider = DiscographySpider(artist_name=request.artist_name, max_albums=request.max_albums)
        # Search URL for artist catalog
        search_url = f"https://musicbrainz.org/search?query={request.artist_name}&type=artist"
        items = await spider.crawl([search_url])
        return {
            "artist": request.artist_name,
            "albums_found": len(items),
            "catalog": items,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Discography crawl failed: {str(exc)}"
        )
