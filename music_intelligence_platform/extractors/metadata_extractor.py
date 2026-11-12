"""Category A: Basic Song Metadata Extractor."""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from discovery.deduplication import clean_song_title, extract_featured_artists
from discovery.source_registry import SourceDefinition
from extractors.base_extractor import BaseExtractor, ExtractionResult
from scrapling_engine.fetcher_manager import ScrapedResponse

logger = logging.getLogger("music_intelligence.extractor.metadata")


class SongMetadataExtractor(BaseExtractor):
    """Extracts Category A basic song metadata using Scrapling adaptive selectors & JSON endpoints."""

    category: str = "basic_metadata"

    def extract(self, response: ScrapedResponse, source_def: Optional[SourceDefinition] = None) -> ExtractionResult:
        parser = response.parser
        source_name = source_def.name if source_def else "Web Source"
        authority = source_def.authority_score if source_def else 0.80

        # Check if response is raw JSON (e.g. from MusicBrainz API or Genius API)
        if response.content.strip().startswith("{") and response.content.strip().endswith("}"):
            try:
                data = json.loads(response.content)
                return self._extract_from_json(data, response, source_name, authority)
            except Exception as e:
                logger.debug(f"JSON parse attempt failed: {e}. Falling back to HTML parsing.")

        # HTML extraction via Scrapling Adaptive Selectors
        raw_title = parser.extract_css(
            "h1.song-title::text",
            [
                "h1::text",
                "meta[property='og:title']::attr(content)",
                ".recording-title::text",
                "table tr:contains('Title') td::text",
            ]
        ) or ""

        clean_t, featured_from_title = extract_featured_artists(raw_title)

        primary_artist = parser.extract_css(
            "a[href*='/artist/']::text",
            [
                "h2.artist-name a::text",
                "meta[name='music:musician']::attr(content)",
                ".artist::text",
                "table tr:contains('Artist') td a::text",
            ]
        ) or ""

        album = parser.extract_css(
            "a[href*='/release/']::text",
            [
                "span.album-title::text",
                "meta[property='music:album']::attr(content)",
                "table tr:contains('Album') td::text",
            ]
        )

        release_date = parser.extract_css(
            "span.release-date::text",
            [
                "meta[property='music:release_date']::attr(content)",
                "table tr:contains('Date') td::text",
                "span.year::text",
            ]
        )
        if not release_date:
            release_date = parser.extract_regex(r"\b(19\d{2}|20\d{2})\b")

        genre = parser.extract_css(
            "span.genre::text",
            [
                "div.genre a::text",
                "table tr:contains('Genre') td::text",
                "meta[property='music:genre']::attr(content)",
            ]
        )

        duration_raw = parser.extract_css(
            "span.duration::text",
            [
                "meta[property='music:duration']::attr(content)",
                "table tr:contains('Length') td::text",
            ]
        )

        duration_formatted, duration_seconds = self._parse_duration(duration_raw)

        record_label = parser.extract_css(
            "a[href*='/label/']::text",
            [
                "table tr:contains('Label') td a::text",
                "span.label::text",
            ]
        )

        isrc = parser.extract_css(
            "ul.isrc-list li::text",
            [
                "span.isrc::text",
                "table tr:contains('ISRC') td::text",
            ]
        )
        if not isrc:
            # Look for 12-character ISRC pattern (e.g., US-S1Z-20-00001 or USS1Z2000001)
            isrc_match = parser.extract_regex(r"\b([A-Z]{2}-?[A-Z0-9]{3}-?\d{2}-?\d{5})\b")
            if isrc_match:
                isrc = isrc_match.replace("-", "").upper()

        language = parser.extract_css("span.language::text", ["meta[property='og:locale']::attr(content)"]) or "en"

        return ExtractionResult(
            category=self.category,
            data={
                "title": clean_t or raw_title,
                "artist": primary_artist,
                "featured_artists": featured_from_title,
                "album": album or "",
                "release_date": release_date or "",
                "genre": genre or "",
                "subgenre": None,
                "duration": duration_formatted or "",
                "duration_seconds": duration_seconds,
                "language": language[:2].lower() if language else "en",
                "record_label": record_label or "",
                "isrc": isrc,
            },
            source_name=source_name,
            source_url=response.url,
            retrieval_timestamp=response.retrieved_at,
            authority_score=authority,
            confidence_score=0.92,
        )

    def _extract_from_json(self, data: Dict, response: ScrapedResponse, source_name: str, authority: float) -> ExtractionResult:
        """Parses MusicBrainz or Genius standard JSON response payload."""
        title = ""
        artist = ""
        album = ""
        release_date = ""
        isrc = None
        duration_seconds = None
        duration_formatted = ""

        # MusicBrainz Recording JSON
        if "recordings" in data and data["recordings"]:
            rec = data["recordings"][0]
            title = rec.get("title", "")
            if "artist-credit" in rec and rec["artist-credit"]:
                artist = rec["artist-credit"][0].get("name", "")
            if "releases" in rec and rec["releases"]:
                rel = rec["releases"][0]
                album = rel.get("title", "")
                release_date = rel.get("date", "")
            if "isrcs" in rec and rec["isrcs"]:
                isrc = rec["isrcs"][0]
            if "length" in rec and rec["length"]:
                ms = int(rec["length"])
                duration_seconds = ms // 1000
                duration_formatted = f"{duration_seconds // 60}:{duration_seconds % 60:02d}"

        return ExtractionResult(
            category=self.category,
            data={
                "title": title,
                "artist": artist,
                "featured_artists": [],
                "album": album,
                "release_date": release_date,
                "genre": "",
                "subgenre": None,
                "duration": duration_formatted,
                "duration_seconds": duration_seconds,
                "language": "en",
                "record_label": "",
                "isrc": isrc,
            },
            source_name=source_name,
            source_url=response.url,
            retrieval_timestamp=response.retrieved_at,
            authority_score=authority,
            confidence_score=0.96,
        )

    def _parse_duration(self, raw: Optional[str]) -> tuple[Optional[str], Optional[int]]:
        if not raw:
            return None, None
        raw = raw.strip()
        # Format MM:SS or HH:MM:SS
        time_match = re.search(r"(\d+):(\d{2})(?::(\d{2}))?", raw)
        if time_match:
            parts = [int(p) for p in time_match.groups() if p is not None]
            if len(parts) == 2:
                seconds = parts[0] * 60 + parts[1]
                return f"{parts[0]}:{parts[1]:02d}", seconds
            elif len(parts) == 3:
                seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
                return f"{parts[0]}:{parts[1]:02d}:{parts[2]:02d}", seconds

        # Format integer seconds or ms
        if raw.isdigit():
            val = int(raw)
            if val > 10000:  # milliseconds
                val = val // 1000
            return f"{val // 60}:{val % 60:02d}", val

        return raw, None
