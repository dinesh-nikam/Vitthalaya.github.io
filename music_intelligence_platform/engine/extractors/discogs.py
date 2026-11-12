"""Discogs Discography Extractor."""

import re
from typing import Dict, Any
from engine.extractors.base import BaseExtractor
from engine.scrapling_fetcher import FetchResult
from core.security import sanitize_text


class DiscogsExtractor(BaseExtractor):
    source_id = "discogs"

    def extract(self, fetch_result: FetchResult, selectors: Dict[str, str]) -> Dict[str, Any]:
        title = self.query_first(fetch_result, selectors.get("title", "h1[class*='title'], .profile h1"))
        artist = self.query_first(fetch_result, selectors.get("artist", "h1[class*='title'] a"))
        label = self.query_first(fetch_result, selectors.get("label", "table.content_table tr:contains('Label:') td a"))
        producers = self.query_selector(fetch_result, selectors.get("producer", "table.content_table tr:contains('Producer') td"))
        engineers = self.query_selector(fetch_result, selectors.get("engineers", "table.content_table tr:contains('Engineer') td"))

        # Release year if in text
        year_match = re.search(r"\b(19\d{2}|20\d{2})\b", fetch_result.text)
        release_year = year_match.group(1) if year_match else None

        return {
            "title": title or "Unknown Title",
            "artist": artist or "Unknown Artist",
            "record_label": label,
            "release_date": release_year,
            "producers": [{"name": p, "role": "producer"} for p in producers],
            "engineers": [{"name": e, "role": "engineer"} for e in engineers],
            "source_authority": 0.95,
            "raw_url": fetch_result.url,
        }
