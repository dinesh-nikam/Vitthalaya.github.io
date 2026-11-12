"""Genius Authorized Lyrics and Credits Extractor."""

import re
from typing import Dict, Any
from engine.extractors.base import BaseExtractor
from engine.scrapling_fetcher import FetchResult
from core.security import clean_lyrics_text


class GeniusExtractor(BaseExtractor):
    source_id = "genius"

    def extract(self, fetch_result: FetchResult, selectors: Dict[str, str]) -> Dict[str, Any]:
        title = self.query_first(fetch_result, selectors.get("title", "h1[class*='SongHeader'], h1.header-title"))
        artist = self.query_first(fetch_result, selectors.get("artist", "a[class*='HeaderArtistAndTrack'], span[class*='PrimaryArtist']"))
        
        # Raw lyrics container extraction
        lyrics_elements = self.query_selector(fetch_result, selectors.get("lyrics", "div[class*='Lyrics__Container'], div.lyrics"))
        raw_lyrics = "\n".join(lyrics_elements)
        
        if not raw_lyrics:
            # Fallback regex for genius lyrics containers
            matches = re.findall(r'<div[^>]*data-lyrics-container="true"[^>]*>(.*?)</div>', fetch_result.text, re.DOTALL)
            if matches:
                raw_lyrics = "\n".join(matches)

        cleaned_lyrics = clean_lyrics_text(raw_lyrics)

        return {
            "title": title or "Unknown Title",
            "artist": artist or "Unknown Artist",
            "lyrics": cleaned_lyrics,
            "source_authority": 0.90,
            "raw_url": fetch_result.url,
        }
