"""Domain-level rate limiter with jitter and concurrency protection."""

import asyncio
import random
import time
from typing import Dict
from urllib.parse import urlparse

from config.logging_config import logger


class DomainRateLimiter:
    """Enforces polite per-domain delay with jitter to prevent server overload."""

    def __init__(self):
        self._last_access: Dict[str, float] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    def _get_domain(self, url: str) -> str:
        return urlparse(url).netloc.lower()

    def _get_lock(self, domain: str) -> asyncio.Lock:
        if domain not in self._locks:
            self._locks[domain] = asyncio.Lock()
        return self._locks[domain]

    async def wait_for_domain(self, url: str, base_delay: float = 2.0) -> None:
        """Asynchronously delays execution until the domain rate limit interval has passed."""
        domain = self._get_domain(url)
        lock = self._get_lock(domain)

        async with lock:
            now = time.time()
            last = self._last_access.get(domain, 0.0)
            elapsed = now - last

            # Add jitter (+/- 15%)
            jitter = random.uniform(0.85, 1.15)
            required_wait = (base_delay * jitter) - elapsed

            if required_wait > 0:
                logger.debug(f"Rate limiting domain '{domain}': sleeping for {required_wait:.2f}s")
                await asyncio.sleep(required_wait)

            self._last_access[domain] = time.time()


domain_rate_limiter = DomainRateLimiter()
