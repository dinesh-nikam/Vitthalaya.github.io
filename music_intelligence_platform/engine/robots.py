"""Robots.txt compliance, parser, and caching manager."""

import time
import urllib.robotparser
from typing import Dict, Tuple, Optional
from urllib.parse import urlparse
import httpx

from config.logging_config import logger
from config.settings import settings


class RobotsManager:
    """Manages domain robots.txt compliance with local caching and crawl-delay enforcement."""

    def __init__(self, cache_ttl: int = settings.robots_txt_cache_ttl):
        self.cache_ttl = cache_ttl
        # domain -> (RobotFileParser, timestamp, crawl_delay)
        self._cache: Dict[str, Tuple[urllib.robotparser.RobotFileParser, float, float]] = {}

    def _get_domain(self, url: str) -> str:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"

    async def get_parser(self, url: str) -> Tuple[urllib.robotparser.RobotFileParser, float]:
        """Retrieves or asynchronously downloads and caches robots.txt parser for domain."""
        domain = self._get_domain(url)
        now = time.time()

        if domain in self._cache:
            parser, cached_at, crawl_delay = self._cache[domain]
            if now - cached_at < self.cache_ttl:
                return parser, crawl_delay

        robots_url = f"{domain}/robots.txt"
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(robots_url)
        crawl_delay = settings.default_domain_delay

        try:
            async with httpx.AsyncClient(timeout=10.0, headers={"User-Agent": settings.user_agent}) as client:
                res = await client.get(robots_url)
                if res.status_code == 200:
                    lines = res.text.splitlines()
                    rp.parse(lines)
                    # Extract crawl delay if present
                    extracted_delay = rp.crawl_delay(settings.user_agent) or rp.crawl_delay("*")
                    if extracted_delay:
                        crawl_delay = float(extracted_delay)
                    logger.info(f"Loaded and parsed robots.txt from {robots_url} (delay: {crawl_delay}s)")
                elif res.status_code in (401, 403):
                    # Disallowed entirely
                    rp.disallow_all = True
                    logger.warning(f"Robots.txt restricted at {robots_url} (Status: {res.status_code})")
                else:
                    # 404 or others -> default allow
                    rp.allow_all = True
                    logger.info(f"No restrictive robots.txt at {robots_url} (Status: {res.status_code})")
        except Exception as exc:
            logger.warning(f"Failed to fetch {robots_url}, assuming polite access: {exc}")
            rp.allow_all = True

        self._cache[domain] = (rp, now, crawl_delay)
        return rp, crawl_delay

    async def is_allowed(self, url: str, user_agent: Optional[str] = None) -> bool:
        """Determines if the given URL is allowed by robots.txt."""
        ua = user_agent or settings.user_agent
        parser, _ = await self.get_parser(url)
        return parser.can_fetch(ua, url)

    async def get_crawl_delay(self, url: str) -> float:
        """Returns the configured crawl delay for the target domain."""
        _, delay = await self.get_parser(url)
        return max(delay, settings.default_domain_delay)


robots_manager = RobotsManager()
