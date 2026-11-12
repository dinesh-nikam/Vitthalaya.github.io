"""Token bucket and adaptive per-domain rate limiter with randomized jitter."""

import asyncio
from datetime import datetime, timezone
import logging
import random
import time
from typing import Dict
from urllib.parse import urlparse

from config.settings import settings

logger = logging.getLogger("music_intelligence.ratelimit")


class DomainBucket:
    def __init__(self, requests_per_second: float = 1.0, burst: int = 1):
        self.rate = requests_per_second
        self.burst = burst
        self.tokens = float(burst)
        self.last_updated = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self, jitter_ratio: float = 0.25):
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_updated
            self.last_updated = now

            # Replenish tokens
            self.tokens = min(float(self.burst), self.tokens + elapsed * self.rate)

            if self.tokens < 1.0:
                deficit = 1.0 - self.tokens
                sleep_time = deficit / self.rate
                # Add humanized jitter
                jitter = random.uniform(0.05, sleep_time * jitter_ratio)
                total_wait = sleep_time + jitter
                logger.debug(f"Pacing request: waiting {total_wait:.2f}s for tokens to replenish.")
                await asyncio.sleep(total_wait)
                self.tokens = 0.0
                self.last_updated = time.monotonic()
            else:
                self.tokens -= 1.0
                # Small base polite jitter even when tokens available
                base_jitter = random.uniform(0.1, 0.4)
                await asyncio.sleep(base_jitter)


class RateLimiter:
    """Manages separate rate limits per domain hostname."""

    def __init__(self, default_rate: float = 0.5):
        self.default_rate = default_rate
        self._domain_buckets: Dict[str, DomainBucket] = {}
        self._lock = asyncio.Lock()

    def _extract_domain(self, url: str) -> str:
        parsed = urlparse(url)
        return parsed.netloc.lower() or "default"

    async def register_domain(self, domain: str, requests_per_second: float):
        async with self._lock:
            self._domain_buckets[domain.lower()] = DomainBucket(requests_per_second)

    async def wait_for_slot(self, url: str, crawl_delay: float | None = None):
        domain = self._extract_domain(url)
        async with self._lock:
            if domain not in self._domain_buckets:
                rate = (1.0 / crawl_delay) if (crawl_delay and crawl_delay > 0) else self.default_rate
                self._domain_buckets[domain] = DomainBucket(rate)
            bucket = self._domain_buckets[domain]

        await bucket.acquire()


# Global rate limiter
rate_limiter = RateLimiter(default_rate=0.8)
