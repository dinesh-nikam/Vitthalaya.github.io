"""Crawler Orchestrator Service integrating compliance, rate-limiting, Scrapling, and database persistence."""

import hashlib
import time
import uuid
import yaml
from pathlib import Path
from typing import Dict, Any, Optional

from config.logging_config import logger
from config.settings import settings
from core.database import async_session_scope
from core.exceptions import RobotsDisallowedError, SourceNotFoundError
from engine.extractors import get_extractor
from engine.rate_limiter import domain_rate_limiter
from engine.robots import robots_manager
from engine.scrapling_fetcher import scrapling_fetcher
from models.artist import Artist
from models.composition import Composition
from models.lyrics import Lyrics
from models.recording import Recording
from models.source import CrawlAuditLog
from schemas.crawl import CrawlJobRequest, CrawlJobResponse, SourceRegistryItem


class CrawlerService:
    """High-level crawler service for music composition & lyrics intelligence."""

    def __init__(self):
        self._sources_cache: Optional[Dict[str, SourceRegistryItem]] = None

    def get_sources_registry(self) -> Dict[str, SourceRegistryItem]:
        """Loads and parses source configurations from sources_registry.yaml."""
        if self._sources_cache is not None:
            return self._sources_cache

        yaml_path = Path(settings.sources_registry_path)
        if not yaml_path.exists():
            logger.warning(f"Sources registry file not found at {yaml_path}")
            return {}

        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        sources = {}
        for item in data.get("sources", []):
            parsed = SourceRegistryItem(**item)
            sources[parsed.id] = parsed

        self._sources_cache = sources
        return sources

    async def execute_crawl_job(self, req: CrawlJobRequest) -> CrawlJobResponse:
        """Executes a single compliant crawl and extraction cycle."""
        job_id = str(uuid.uuid4())
        start_time = time.time()
        registry = self.get_sources_registry()
        source_cfg = registry.get(req.source_id)

        if not source_cfg:
            logger.info(f"Source ID '{req.source_id}' not found in registry; using default dynamic policy.")
            delay = settings.default_domain_delay
            requires_js = False
            authority_score = 0.8
            selectors = {}
        else:
            delay = 1.0 / max(source_cfg.rate_limit_per_second, 0.1)
            requires_js = source_cfg.requires_js
            authority_score = source_cfg.authority_score
            selectors = source_cfg.adaptive_selectors

        # 1. Robots.txt Compliance Check
        if not req.bypass_cache:
            allowed = await robots_manager.is_allowed(req.target_url)
            if not allowed:
                duration_ms = (time.time() - start_time) * 1000
                logger.warning(f"Robots.txt disallows crawling of {req.target_url}")
                return CrawlJobResponse(
                    job_id=job_id,
                    source_id=req.source_id,
                    target_url=req.target_url,
                    status="DISALLOWED",
                    http_status=403,
                    duration_ms=duration_ms,
                    items_extracted=0,
                    data=None,
                    audit_hash="",
                    error_message=f"Robots.txt prohibits bot access on target domain for URL {req.target_url}",
                    created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                )

        # 2. Domain Rate Limiting with Jitter
        await domain_rate_limiter.wait_for_domain(req.target_url, base_delay=delay)

        # 3. Fetch Content
        try:
            fetch_res = await scrapling_fetcher.fetch(req.target_url, requires_js=requires_js)
        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(f"Failed to fetch {req.target_url}: {exc}")
            return CrawlJobResponse(
                job_id=job_id,
                source_id=req.source_id,
                target_url=req.target_url,
                status="FAILED",
                http_status=500,
                duration_ms=duration_ms,
                items_extracted=0,
                data=None,
                audit_hash="",
                error_message=str(exc),
                created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )

        # 4. Extract Structured Metadata
        extractor = get_extractor(req.source_id)
        extracted_data = extractor.extract(fetch_res, selectors)

        payload_bytes = fetch_res.text.encode("utf-8", errors="replace")
        payload_hash = hashlib.sha256(payload_bytes).hexdigest()
        duration_ms = (time.time() - start_time) * 1000

        # 5. Persist to Database if not dry_run
        if not req.dry_run and fetch_res.status_code == 200:
            await self._persist_extracted_entities(
                source_id=req.source_id,
                data=extracted_data,
                target_url=req.target_url,
                http_status=fetch_res.status_code,
                duration_ms=duration_ms,
                authority_score=authority_score,
                payload_hash=payload_hash,
            )

        return CrawlJobResponse(
            job_id=job_id,
            source_id=req.source_id,
            target_url=req.target_url,
            status="SUCCESS",
            http_status=fetch_res.status_code,
            duration_ms=duration_ms,
            items_extracted=1 if extracted_data.get("title") else 0,
            data=extracted_data,
            audit_hash=payload_hash,
            error_message=None,
            created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

    async def _persist_extracted_entities(
        self,
        source_id: str,
        data: Dict[str, Any],
        target_url: str,
        http_status: int,
        duration_ms: float,
        authority_score: float,
        payload_hash: str,
    ) -> None:
        """Atomically persists extracted artist, composition, lyrics, and crawl audit log."""
        async with async_session_scope() as session:
            # 1. Audit Log
            audit = CrawlAuditLog(
                source_id=source_id,
                target_url=target_url,
                http_status=http_status,
                items_extracted=1,
                duration_ms=duration_ms,
                authority_score=authority_score,
                payload_hash=payload_hash,
            )
            session.add(audit)

            # 2. Artist
            artist_name = data.get("artist") or data.get("saint_name_marathi")
            artist_id = None
            if artist_name:
                artist = Artist(
                    name=artist_name,
                    authority_score=authority_score,
                    verified=False,
                )
                session.add(artist)
                await session.flush()
                artist_id = artist.id

            # 3. Composition
            comp_title = data.get("title") or "Untitled Composition"
            composition = Composition(
                title=comp_title,
                title_native=data.get("title_native"),
                work_type=data.get("work_type", "Song"),
                iswc=data.get("iswc"),
                musical_key=data.get("musical_key"),
                meter=data.get("meter"),
                primary_artist_id=artist_id,
                composer_credits=data.get("composers", []),
                lyricist_credits=data.get("writers", []),
                authority_score=authority_score,
            )
            session.add(composition)
            await session.flush()

            # 4. Lyrics
            lyrics_text = data.get("lyrics")
            if lyrics_text:
                lyrics = Lyrics(
                    composition_id=composition.id,
                    language=data.get("language", "en"),
                    full_text=lyrics_text,
                    is_public_domain=data.get("is_public_domain", False),
                    source_attribution=f"{source_id} ({target_url})",
                    source_url=target_url,
                    quality_score=authority_score,
                )
                session.add(lyrics)

            # 5. Recording
            if data.get("isrc") or data.get("duration_seconds"):
                recording = Recording(
                    composition_id=composition.id,
                    artist_id=artist_id,
                    title=comp_title,
                    isrc=data.get("isrc"),
                    duration_seconds=data.get("duration_seconds"),
                    album_title=data.get("album"),
                    record_label=data.get("record_label"),
                )
                session.add(recording)


crawler_service = CrawlerService()
