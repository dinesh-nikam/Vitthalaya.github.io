"""Base Scrapling Spider with concurrency, rate-limiting, and structured data extraction."""

import asyncio
from datetime import datetime, timezone
import logging
from typing import AsyncGenerator, Callable, Dict, List, Optional, Set
from urllib.parse import urljoin

from scrapling_engine.fetcher_manager import ScrapedResponse, fetcher_manager

logger = logging.getLogger("music_intelligence.spider")


class SpiderItem:
    """Container for data items yielded by spiders."""
    def __init__(self, data: Dict, source_url: str, spider_name: str):
        self.data = data
        self.source_url = source_url
        self.spider_name = spider_name
        self.scraped_at = datetime.now(timezone.utc)


class BaseMusicSpider:
    """Base crawler class supporting concurrent crawling with Scrapling."""

    name: str = "base_music_spider"
    start_urls: List[str] = []
    max_depth: int = 2
    max_concurrency: int = 4

    def __init__(self, requires_js: bool = False):
        self.requires_js = requires_js
        self.visited_urls: Set[str] = set()
        self.semaphore = asyncio.Semaphore(self.max_concurrency)

    async def parse(self, response: ScrapedResponse) -> AsyncGenerator[Dict, None]:
        """Override this method to parse response and yield items or new request URLs."""
        raise NotImplementedError("Subclasses must implement parse()")

    async def _process_url(self, url: str) -> List[Dict]:
        if url in self.visited_urls:
            return []
        self.visited_urls.add(url)

        async with self.semaphore:
            try:
                response = await fetcher_manager.fetch(url, requires_js=self.requires_js)
                items = []
                async for item in self.parse(response):
                    items.append(item)
                return items
            except Exception as exc:
                logger.error(f"[{self.name}] Error processing {url}: {exc}")
                return []

    async def crawl(self, urls: Optional[List[str]] = None) -> List[Dict]:
        """Runs the spider across given or start URLs concurrently."""
        target_urls = urls or self.start_urls
        logger.info(f"[{self.name}] Starting crawl across {len(target_urls)} target URLs.")
        tasks = [self._process_url(u) for u in target_urls]
        results_nested = await asyncio.gather(*tasks, return_exceptions=True)

        all_items: List[Dict] = []
        for res in results_nested:
            if isinstance(res, list):
                all_items.extend(res)
            elif isinstance(res, Exception):
                logger.warning(f"Spider encountered exception in batch: {res}")

        logger.info(f"[{self.name}] Crawl completed. Extracted {len(all_items)} items.")
        return all_items
