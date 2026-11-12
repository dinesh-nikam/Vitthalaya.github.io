"""Discography spider that extracts artist albums, tracklists, and release catalogs."""

import logging
from typing import AsyncGenerator, Dict, List
from urllib.parse import urljoin
from scrapling_engine.fetcher_manager import ScrapedResponse
from scrapling_engine.spiders.base_spider import BaseMusicSpider

logger = logging.getLogger("music_intelligence.spider.discography")


class DiscographySpider(BaseMusicSpider):
    """Crawls an artist page to extract all albums and songs in their catalog."""

    name: str = "discography_spider"

    def __init__(self, artist_name: str, max_albums: int = 10, requires_js: bool = False):
        super().__init__(requires_js=requires_js)
        self.artist_name = artist_name
        self.max_albums = max_albums

    async def parse(self, response: ScrapedResponse) -> AsyncGenerator[Dict, None]:
        parser = response.parser

        # 1. Extract albums from table or cards
        album_elements = parser.selector.css("table.medium-table tr, .discography-card, div.album-entry")
        if not album_elements:
            album_elements = parser.selector.xpath("//tr[contains(@class, 'release')] | //div[contains(@class, 'release')]")

        count = 0
        for el in album_elements:
            if count >= self.max_albums:
                break

            title = el.css("a[href*='release']::text, .album-title::text, td.title::text").get()
            year = el.css("span.year::text, td.date::text, span.release-date::text").get()
            album_url = el.css("a[href*='release']::attr(href)").get()

            if title:
                count += 1
                yield {
                    "type": "album",
                    "artist": self.artist_name,
                    "title": str(title).strip(),
                    "year": str(year).strip() if year else None,
                    "url": urljoin(response.url, str(album_url)) if album_url else None,
                }
