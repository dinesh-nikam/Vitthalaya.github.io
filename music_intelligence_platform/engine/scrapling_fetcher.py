"""Scrapling and HTTP fetching integration with stealth, adaptive parsing, and resilience."""

import asyncio
from typing import Optional, Dict, Any
from dataclasses import dataclass
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from config.logging_config import logger
from config.settings import settings


@dataclass
class FetchResult:
    url: str
    status_code: int
    text: str
    headers: Dict[str, str]
    duration_ms: float
    used_js_fetcher: bool
    adaptor: Optional[Any] = None  # Scrapling Adaptor instance if available


class ScraplingFetcher:
    """Intelligent fetcher that coordinates Scrapling headless/stealth browser fetchers and resilient async HTTP."""

    def __init__(self):
        self.user_agent = settings.user_agent
        self.timeout = settings.scrapling_timeout

    def _get_headers(self) -> Dict[str, str]:
        return {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,mr;q=0.8,hi;q=0.7",
            "DNT": "1",
            "Upgrade-Insecure-Requests": "1",
        }

    async def fetch(self, url: str, requires_js: bool = False) -> FetchResult:
        """Fetches page content via Scrapling Adaptor or HTTP client."""
        start_time = asyncio.get_event_loop().time()

        if requires_js:
            return await self._fetch_scrapling(url, start_time)
        else:
            return await self._fetch_http(url, start_time)

    async def _fetch_scrapling(self, url: str, start_time: float) -> FetchResult:
        """Executes fetching via Scrapling StealthyFetcher / Adaptor."""
        try:
            from scrapling import Fetcher, Adaptor  # type: ignore

            def run_scrapling():
                fetcher = Fetcher()
                res = fetcher.get(url, timeout=self.timeout)
                return res

            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(None, run_scrapling)
            duration_ms = (loop.time() - start_time) * 1000

            text = res.body.decode("utf-8", errors="replace") if hasattr(res, "body") and isinstance(res.body, bytes) else str(res.text if hasattr(res, "text") else "")
            adaptor = Adaptor(text) if text else None

            return FetchResult(
                url=url,
                status_code=getattr(res, "status", 200),
                text=text,
                headers=dict(getattr(res, "headers", {})),
                duration_ms=duration_ms,
                used_js_fetcher=True,
                adaptor=adaptor,
            )
        except Exception as exc:
            logger.warning(f"Scrapling fetcher failed for {url}, falling back to resilient HTTP: {exc}")
            return await self._fetch_http(url, start_time)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True,
    )
    async def _fetch_http(self, url: str, start_time: float) -> FetchResult:
        """Resilient HTTP fetcher with standard connection pooling and retry policies."""
        async with httpx.AsyncClient(
            headers=self._get_headers(),
            timeout=self.timeout,
            follow_redirects=True,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        ) as client:
            res = await client.get(url)
            loop = asyncio.get_event_loop()
            duration_ms = (loop.time() - start_time) * 1000

            # Wrap into Scrapling Adaptor for uniform selector querying
            adaptor = None
            try:
                from scrapling import Adaptor  # type: ignore
                adaptor = Adaptor(res.text)
            except Exception:
                pass

            return FetchResult(
                url=str(res.url),
                status_code=res.status_code,
                text=res.text,
                headers=dict(res.headers),
                duration_ms=duration_ms,
                used_js_fetcher=False,
                adaptor=adaptor,
            )


scrapling_fetcher = ScraplingFetcher()
