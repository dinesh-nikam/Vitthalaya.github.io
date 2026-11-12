"""AllMusic Metadata and Editorial Extractor."""

from typing import Dict, Any
from engine.extractors.base import BaseExtractor
from engine.scrapling_fetcher import FetchResult


class AllMusicExtractor(BaseExtractor):
    source_id = "allmusic"

    def extract(self, fetch_result: FetchResult, selectors: Dict[str, str]) -> Dict[str, Any]:
        title = self.query_first(fetch_result, selectors.get("title", "h1.song-title, .headline-title"))
        composers = self.query_selector(fetch_result, selectors.get("composer", "div.composers a"))
        genres = self.query_selector(fetch_result, selectors.get("genres", "div.genre a"))
        styles = self.query_selector(fetch_result, selectors.get("styles", "div.styles a"))
        themes = self.query_selector(fetch_result, selectors.get("themes", "div.themes a"))

        return {
            "title": title or "Unknown Title",
            "composers": [{"name": c, "role": "composer"} for c in composers],
            "genres": genres,
            "styles": styles,
            "themes": themes,
            "source_authority": 0.92,
            "raw_url": fetch_result.url,
        }
