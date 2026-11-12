"""Category D: Production, Engineering & Recording Credits Extractor."""

import logging
from typing import Any, Dict, List, Optional
from discovery.source_registry import SourceDefinition
from extractors.base_extractor import BaseExtractor, ExtractionResult
from scrapling_engine.fetcher_manager import ScrapedResponse

logger = logging.getLogger("music_intelligence.extractor.production")


class ProductionExtractor(BaseExtractor):
    """Extracts Category D Producers, Mixing/Mastering Engineers, Studios, and Performers."""

    category: str = "production_and_recording"

    def extract(self, response: ScrapedResponse, source_def: Optional[SourceDefinition] = None) -> ExtractionResult:
        parser = response.parser
        source_name = source_def.name if source_def else "Web Source"
        authority = source_def.authority_score if source_def else 0.85

        # 1. Producers
        producers = parser.extract_css_all(
            "table.content_table tr:contains('Producer') td a::text",
            [
                "span[class*='CreditSubtitle']:contains('Produced By') + span a::text",
                "table.details tr:contains('producer') td a::text",
                "ul.song-credits li:contains('Producer') a::text",
                "div.producer-name::text",
            ]
        )

        exec_producers = parser.extract_css_all(
            "table.content_table tr:contains('Executive Producer') td a::text",
            [
                "span[class*='CreditSubtitle']:contains('Executive Producer') + span a::text",
                "div.credits-section:contains('Executive Producer') li::text",
            ]
        )

        # 2. Recording & Mixing Engineers
        recording_engineers = parser.extract_css_all(
            "table.content_table tr:contains('Recorded By') td a::text",
            [
                "table.content_table tr:contains('Recording Engineer') td a::text",
                "div.credits-section:contains('Recording Engineer') li::text",
            ]
        )

        mixing_engineers = parser.extract_css_all(
            "table.content_table tr:contains('Mixed By') td a::text",
            [
                "table.content_table tr:contains('Mixing Engineer') td a::text",
                "span[class*='CreditSubtitle']:contains('Mixing') + span a::text",
                "div.credits-section:contains('Mixed By') li::text",
            ]
        )

        mastering_engineers = parser.extract_css_all(
            "table.content_table tr:contains('Mastered By') td a::text",
            [
                "table.content_table tr:contains('Mastering Engineer') td a::text",
                "span[class*='CreditSubtitle']:contains('Mastering') + span a::text",
                "div.credits-section:contains('Mastered By') li::text",
            ]
        )

        # 3. Studios
        studios = parser.extract_css_all(
            "table.content_table tr:contains('Recorded At') td a::text",
            [
                "table.content_table tr:contains('Studio') td a::text",
                "table.details tr:contains('recorded at') td a::text",
                "span.studio-name::text",
            ]
        )

        return ExtractionResult(
            category=self.category,
            data={
                "production": {
                    "producer": producers,
                    "executive_producer": exec_producers,
                    "recording_engineer": recording_engineers,
                    "mixing_engineer": mixing_engineers,
                    "mastering_engineer": mastering_engineers,
                    "recording_studio": studios,
                    "performers": {},
                }
            },
            source_name=source_name,
            source_url=response.url,
            retrieval_timestamp=response.retrieved_at,
            authority_score=authority,
            confidence_score=0.91,
        )
