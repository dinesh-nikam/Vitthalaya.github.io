"""Songfacts Composition & Songwriting History Extractor."""

from typing import Dict, Any
from engine.extractors.base import BaseExtractor
from engine.scrapling_fetcher import FetchResult


class SongfactsExtractor(BaseExtractor):
    source_id = "songfacts"

    def extract(self, fetch_result: FetchResult, selectors: Dict[str, str]) -> Dict[str, Any]:
        title = self.query_first(fetch_result, selectors.get("title", "h1.title"))
        artist = self.query_first(fetch_result, selectors.get("artist", "h2.artist a"))
        album = self.query_first(fetch_result, selectors.get("album", "div.album-title"))
        writers = self.query_selector(fetch_result, selectors.get("writers", "ul.song-credits li:contains('Writer') a"))
        producers = self.query_selector(fetch_result, selectors.get("producer", "ul.song-credits li:contains('Producer') a"))
        key_facts = self.query_selector(fetch_result, selectors.get("key_facts", "div.songfact-text"))

        return {
            "title": title or "Unknown Title",
            "artist": artist or "Unknown Artist",
            "album": album,
            "writers": [{"name": w, "role": "songwriter"} for w in writers],
            "producers": [{"name": p, "role": "producer"} for p in producers],
            "trivia_and_background": key_facts,
            "source_authority": 0.88,
            "raw_url": fetch_result.url,
        }
