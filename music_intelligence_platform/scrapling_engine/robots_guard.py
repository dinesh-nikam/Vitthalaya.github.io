"""Robots.txt compliance engine with intelligent caching and domain crawl-delay parsing."""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Dict, Optional, Tuple
from urllib.parse import urlparse
import urllib.robotparser

import httpx

from config.settings import settings
from core.exceptions import RobotsDisallowedError

logger = logging.getLogger("music_intelligence.robots")


class RobotsEntry:
    def __init__(self, parser: urllib.robotparser.RobotFileParser, fetched_at: datetime):
        self.parser = parser
        self.fetched_at = fetched_at

    def is_expired(self, ttl_seconds: int) -> bool:
        age = (datetime.now(timezone.utc) - self.fetched_at).total_seconds()
        return age > ttl_seconds


class RobotsGuard:
    """Enforces robots.txt directives per domain, caching parsers with TTL."""

    def __init__(self, user_agent: str = settings.user_agent, cache_ttl: int = settings.robots_txt_cache_ttl):
        self.user_agent = user_agent
        self.cache_ttl = cache_ttl
        self._cache: Dict[str, RobotsEntry] = {}
        self._lock = asyncio.Lock()

    def _get_robots_url(self, target_url: str) -> Tuple[str, str]:
        parsed = urlparse(target_url)
        domain = f"{parsed.scheme}://{parsed.netloc}"
        robots_url = f"{domain}/robots.txt"
        return domain, robots_url

    async def _fetch_and_parse(self, domain: str, robots_url: str) -> urllib.robotparser.RobotFileParser:
        parser = urllib.robotparser.RobotFileParser()
        parser.set_url(robots_url)
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(robots_url, headers={"User-Agent": self.user_agent})
                if resp.status_code == 200:
                    parser.parse(resp.text.splitlines())
                elif resp.status_code in (401, 403):
                    # Disallow all if robots.txt itself is restricted
                    parser.disallow_all = True
                else:
                    # 404 or other: allow by default
                    parser.allow_all = True
        except Exception as exc:
            logger.warning(f"Failed to fetch robots.txt for {domain}: {exc}. Defaulting to polite access.")
            parser.allow_all = True
        return parser

    async def get_parser(self, target_url: str) -> urllib.robotparser.RobotFileParser:
        domain, robots_url = self._get_robots_url(target_url)
        async with self._lock:
            entry = self._cache.get(domain)
            if entry and not entry.is_expired(self.cache_ttl):
                return entry.parser

            parser = await self._fetch_and_parse(domain, robots_url)
            self._cache[domain] = RobotsEntry(parser, datetime.now(timezone.utc))
            return parser

    async def can_fetch(self, target_url: str) -> bool:
        """Checks if the user agent is permitted to fetch target_url."""
        parser = await self.get_parser(target_url)
        allowed = parser.can_fetch(self.user_agent, target_url)
        if not allowed:
            logger.info(f"Target URL is disallowed by robots.txt: {target_url}")
        return allowed

    async def get_crawl_delay(self, target_url: str) -> Optional[float]:
        """Returns crawl-delay specified in robots.txt if any."""
        parser = await self.get_parser(target_url)
        try:
            delay = parser.crawl_delay(self.user_agent)
            return float(delay) if delay is not None else None
        except Exception:
            return None

    async def verify_compliance(self, target_url: str) -> None:
        """Throws RobotsDisallowedError if URL is disallowed."""
        allowed = await self.can_fetch(target_url)
        if not allowed:
            raise RobotsDisallowedError(
                f"Crawling prohibited by domain robots.txt: {target_url}",
                details={"target_url": target_url, "user_agent": self.user_agent}
            )


# Global RobotsGuard singleton
robots_guard = RobotsGuard()
