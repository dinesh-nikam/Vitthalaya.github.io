"""Category E: Artist Intelligence, Biography, Influences, and Collaborations Extractor."""

import logging
from typing import Any, Dict, List, Optional
from discovery.source_registry import SourceDefinition
from extractors.base_extractor import BaseExtractor, ExtractionResult
from scrapling_engine.fetcher_manager import ScrapedResponse

logger = logging.getLogger("music_intelligence.extractor.artist")


class ArtistIntelligenceExtractor(BaseExtractor):
    """Extracts Category E Artist Biography, Influences, Discography, and Collaborations."""

    category: str = "artist_intelligence"

    def extract(self, response: ScrapedResponse, source_def: Optional[SourceDefinition] = None) -> ExtractionResult:
        parser = response.parser
        source_name = source_def.name if source_def else "Web Source"
        authority = source_def.authority_score if source_def else 0.85

        name = parser.extract_css("h1.artist-name::text", ["h1::text", ".profile-title::text"]) or ""
        biography = parser.extract_css(
            "div.biography-text::text",
            [
                "div.bio p::text",
                "div[class*='ArtistBio']::text",
                "table.profile_bio::text",
            ]
        )

        genres = parser.extract_css_all(
            "div.genres a::text",
            [
                "table tr:contains('Genre') td a::text",
                "ul.genre-list li::text",
            ]
        )

        influences = parser.extract_css_all(
            "div.influences a::text",
            [
                "table tr:contains('Influenced By') td a::text",
                "ul.influences-list li::text",
            ]
        )

        collaborations = parser.extract_css_all(
            "div.collaborators a::text",
            [
                "table tr:contains('Collaborations') td a::text",
                "ul.collaborators-list li::text",
            ]
        )

        return ExtractionResult(
            category=self.category,
            data={
                "artist": {
                    "name": name,
                    "biography": biography,
                    "genres": genres,
                    "influences": influences,
                    "collaborations": collaborations,
                }
            },
            source_name=source_name,
            source_url=response.url,
            retrieval_timestamp=response.retrieved_at,
            authority_score=authority,
            confidence_score=0.90,
        )
