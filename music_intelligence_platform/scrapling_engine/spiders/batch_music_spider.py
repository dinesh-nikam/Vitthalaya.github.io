"""Batch music spider for high-throughput multi-song exploration."""

import logging
from typing import AsyncGenerator, Dict, List
from scrapling_engine.fetcher_manager import ScrapedResponse
from scrapling_engine.spiders.base_spider import BaseMusicSpider

logger = logging.getLogger("music_intelligence.spider.batch")


class BatchMusicSpider(BaseMusicSpider):
    """Executes high-throughput batch crawling across multiple song URLs."""

    name: str = "batch_music_spider"

    def __init__(self, target_urls: List[str], max_concurrency: int = 4):
        super().__init__(requires_js=False)
        self.start_urls = target_urls
        self.max_concurrency = max_concurrency

    async def parse(self, response: ScrapedResponse) -> AsyncGenerator[Dict, None]:
        parser = response.parser

        title = parser.extract_css("h1::text", ["meta[property='og:title']::attr(content)", "title::text"])
        artist = parser.extract_css(".artist::text", [".subheader a::text", "span.artist-name::text"])

        yield {
            "type": "scraped_raw_page",
            "url": response.url,
            "title": title,
            "artist": artist,
            "html": response.content,
            "retrieved_at": response.retrieved_at.isoformat(),
        }
