"""MusicBrainz Open Music Database Extractor."""

import re
from typing import Dict, Any
from engine.extractors.base import BaseExtractor
from engine.scrapling_fetcher import FetchResult
from core.security import sanitize_text


class MusicBrainzExtractor(BaseExtractor):
    source_id = "musicbrainz"

    def extract(self, fetch_result: FetchResult, selectors: Dict[str, str]) -> Dict[str, Any]:
        title = self.query_first(fetch_result, selectors.get("title", "h1 a span, h1 .recording-title"))
        artist = self.query_first(fetch_result, selectors.get("artist", ".subheader a[href^='/artist/']"))
        duration = self.query_first(fetch_result, selectors.get("duration", "span.duration"))
        album = self.query_first(fetch_result, selectors.get("album", "table.medium-table a[href^='/release/']"))
        
        # Extract ISRC if present
        isrc = self.query_first(fetch_result, selectors.get("isrc", "ul.isrc-list li"))
        if not isrc:
            isrc_match = re.search(r"\b[A-Z]{2}-?[A-Z0-9]{3}-?[0-9]{2}-?[0-9]{5}\b", fetch_result.text)
            if isrc_match:
                isrc = isrc_match.group(0).replace("-", "")

        # Extract ISWC if present
        iswc = None
        iswc_match = re.search(r"\bT-?\d{3}\.?\d{3}\.?\d{3}[-\.]?\d\b", fetch_result.text)
        if iswc_match:
            iswc = iswc_match.group(0)

        # Parse duration seconds from mm:ss
        duration_seconds = None
        if duration and ":" in duration:
            parts = duration.split(":")
            try:
                if len(parts) == 2:
                    duration_seconds = int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    duration_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            except ValueError:
                pass

        # Extract composers / writers credits
        composers = self.query_selector(fetch_result, selectors.get("composers", "table.details tr:contains('composed by') td a"))
        writers = self.query_selector(fetch_result, selectors.get("writers", "table.details tr:contains('written by') td a"))

        return {
            "title": title or "Unknown Title",
            "artist": artist or "Unknown Artist",
            "album": album,
            "duration_seconds": duration_seconds,
            "isrc": isrc,
            "iswc": iswc,
            "composers": [{"name": c, "role": "composer"} for c in composers],
            "writers": [{"name": w, "role": "lyricist"} for w in writers],
            "source_authority": 0.98,
            "raw_url": fetch_result.url,
        }
