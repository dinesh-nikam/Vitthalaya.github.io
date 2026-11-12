"""Fetcher manager coordinating Scrapling Fetcher, AsyncFetcher, and StealthyFetcher."""

import asyncio
from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from scrapling.fetchers import AsyncFetcher, Fetcher, StealthyFetcher
from config.settings import settings
from core.exceptions import ExtractionError, RateLimitExceededError, RobotsDisallowedError
from scrapling_engine.adaptive_parser import AdaptiveScraplingParser
from scrapling_engine.rate_limiter import rate_limiter
from scrapling_engine.robots_guard import robots_guard

logger = logging.getLogger("music_intelligence.fetcher")


class ScrapedResponse:
    """Standardized response container encapsulating Scrapling results and adaptive parser."""

    def __init__(
        self,
        url: str,
        status_code: int,
        content: str,
        headers: Dict[str, str],
        execution_time: float,
        fetcher_type: str,
    ):
        self.url = url
        self.status_code = status_code
        self.content = content
        self.headers = headers
        self.execution_time = execution_time
        self.fetcher_type = fetcher_type
        self.retrieved_at = datetime.now(timezone.utc)
        self.parser = AdaptiveScraplingParser(content)


class FetcherManager:
    """Intelligent Fetcher orchestrator implementing Scrapling Fetcher and StealthyFetcher."""

    def __init__(self, timeout: int = settings.scrapling_timeout, max_retries: int = settings.scrapling_max_retries):
        self.timeout = timeout
        self.max_retries = max_retries

    async def fetch(
        self,
        url: str,
        requires_js: bool = False,
        headers: Optional[Dict[str, str]] = None,
        ignore_robots: bool = False,
    ) -> ScrapedResponse:
        """Fetches a page ethically, respecting robots.txt, rate limits, and choosing the appropriate Scrapling fetcher."""
        # 1. Robots.txt Compliance Check
        if not ignore_robots:
            await robots_guard.verify_compliance(url)
            crawl_delay = await robots_guard.get_crawl_delay(url)
        else:
            crawl_delay = None

        # 2. Rate Limiting Pacing
        await rate_limiter.wait_for_slot(url, crawl_delay)

        # 3. Choose fetcher: Static Fetcher vs Browser-based StealthyFetcher
        req_headers = {
            "User-Agent": settings.user_agent,
            "Accept-Language": "en-US,en;q=0.9",
            **(headers or {}),
        }

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            start_time = time.monotonic()
            try:
                if requires_js:
                    logger.debug(f"[StealthyFetcher] Loading dynamic page: {url} (Attempt {attempt})")
                    # Run StealthyFetcher in threadpool or async_fetch
                    response = await asyncio.to_thread(
                        StealthyFetcher.fetch,
                        url,
                        headless=settings.scrapling_headless,
                        timeout=self.timeout * 1000,
                    )
                    content = response.body.decode("utf-8", errors="replace") if hasattr(response, "body") else str(response)
                    status = getattr(response, "status", 200)
                    fetcher_type = "StealthyFetcher"
                else:
                    logger.debug(f"[Fetcher] Requesting static page: {url} (Attempt {attempt})")
                    # Scrapling static Fetcher.get (powered by curl_cffi)
                    response = await asyncio.to_thread(
                        Fetcher.get,
                        url,
                        headers=req_headers,
                        timeout=self.timeout,
                    )
                    content = response.body.decode("utf-8", errors="replace") if hasattr(response, "body") else str(response)
                    status = getattr(response, "status", getattr(response, "status_code", 200))
                    fetcher_type = "Fetcher"

                execution_time = time.monotonic() - start_time

                if status >= 400:
                    logger.warning(f"HTTP {status} received for {url} on attempt {attempt}")
                    if status in (429, 503):
                        await asyncio.sleep(2.0 * attempt)
                        continue
                    if status == 404:
                        raise ExtractionError(f"Resource not found (HTTP 404): {url}")

                return ScrapedResponse(
                    url=url,
                    status_code=status,
                    content=content,
                    headers=dict(getattr(response, "headers", {})),
                    execution_time=execution_time,
                    fetcher_type=fetcher_type,
                )

            except RobotsDisallowedError:
                raise
            except Exception as exc:
                last_error = exc
                logger.warning(f"Error fetching {url} on attempt {attempt}: {exc}")
                await asyncio.sleep(1.5 * attempt)

        raise ExtractionError(f"Failed to fetch {url} after {self.max_retries} attempts: {last_error}")


# Global fetcher manager singleton
fetcher_manager = FetcherManager()
