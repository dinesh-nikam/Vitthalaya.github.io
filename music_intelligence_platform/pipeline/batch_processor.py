"""Asynchronous batch processor for multi-song and multi-artist research workloads."""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Dict, List, Optional
import uuid

from models.schemas import BatchSongScrapeRequest, SingleSongScrapeRequest, SongIntelligenceResponse
from pipeline.orchestrator import music_pipeline

logger = logging.getLogger("music_intelligence.batch")


class BatchJob:
    def __init__(self, job_id: str, total_items: int):
        self.job_id = job_id
        self.total_items = total_items
        self.completed_items = 0
        self.failed_items = 0
        self.status = "queued"  # queued, running, completed, failed
        self.results: List[Dict] = []
        self.errors: List[Dict] = []
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)


class BatchProcessor:
    """Manages asynchronous batch processing jobs with concurrency limits."""

    def __init__(self):
        self._jobs: Dict[str, BatchJob] = {}
        self._lock = asyncio.Lock()

    def get_job(self, job_id: str) -> Optional[BatchJob]:
        return self._jobs.get(job_id)

    async def submit_batch(self, request: BatchSongScrapeRequest) -> str:
        job_id = str(uuid.uuid4())
        job = BatchJob(job_id, len(request.songs))
        async with self._lock:
            self._jobs[job_id] = job

        # Launch in background
        asyncio.create_task(self._run_batch(job, request.songs, request.concurrency))
        return job_id

    async def _run_batch(self, job: BatchJob, songs: List[SingleSongScrapeRequest], concurrency: int):
        job.status = "running"
        job.updated_at = datetime.now(timezone.utc)
        semaphore = asyncio.Semaphore(concurrency)

        async def _process_one(song_req: SingleSongScrapeRequest):
            async with semaphore:
                try:
                    result = await music_pipeline.execute(song_req)
                    job.results.append(result.model_dump())
                    job.completed_items += 1
                except Exception as exc:
                    logger.error(f"Batch item failed for {song_req.title}: {exc}")
                    job.errors.append({"title": song_req.title, "error": str(exc)})
                    job.failed_items += 1
                finally:
                    job.updated_at = datetime.now(timezone.utc)

        await asyncio.gather(*[_process_one(s) for s in songs])
        job.status = "completed" if job.failed_items == 0 else "partial"
        job.updated_at = datetime.now(timezone.utc)
        logger.info(f"Batch job {job.job_id} finished: {job.completed_items} succeeded, {job.failed_items} failed.")


# Global batch processor singleton
batch_processor = BatchProcessor()
