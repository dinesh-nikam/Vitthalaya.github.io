"""Category B: Lyrics, Songwriting & Poetic Analysis Extractor."""

import logging
import re
from typing import Any, Dict, List, Optional

from core.security import clean_lyrics_text, sanitize_text
from discovery.source_registry import SourceDefinition
from extractors.base_extractor import BaseExtractor, ExtractionResult
from musicology.poetics import (
    analyze_syllable_pattern,
    detect_repeated_phrases,
    detect_rhyme_scheme,
    parse_lyric_sections,
)
from scrapling_engine.fetcher_manager import ScrapedResponse

logger = logging.getLogger("music_intelligence.extractor.lyrics")


class LyricsExtractor(BaseExtractor):
    """Extracts Category B Lyrics, Songwriting Credits, Verse Divisions, and Poetics."""

    category: str = "lyrics_and_songwriting"

    # Common lyrical thematic keywords dictionary across global & regional traditions
    THEME_KEYWORDS = {
        "love": ["love", "heart", "darling", "baby", "kiss", "forever", "together"],
        "heartbreak": ["tears", "cry", "broken", "lonely", "goodbye", "pain", "hurt", "leave"],
        "devotion": ["god", "prayer", "lord", "soul", "divine", "mercy", "grace", "faith", "भक्ती", "देव", "प्रभू"],
        "rebellion": ["fight", "rebel", "chains", "freedom", "rules", "system", "stand"],
        "celebration": ["party", "dance", "night", "celebrate", "music", "lights", "drink"],
        "nostalgia": ["yesterday", "childhood", "remember", "years", "old", "memories", "past"],
        "varkari_abhang": ["विठ्ठल", "पांडुरंग", "माऊली", "रखुमाई", "चंद्रभागा", "पुंडलिक", "तुका", "नामदेव", "ज्ञानोबा", "वारकरी", "अभंग"],
        "gaulani": ["गवळण", "कान्हा", "यशोदा", "मुरली", "वेणू", "दही", "दूध", "लोणी", "गोकुळ", "मथूरा", "सखी"],
        "bharud": ["विंचू", "चावला", "दादला", "भुत्या", "वाघ्या", "जोशी", "बहुरूपी", "पांगुळ", "सत्व", "तम", "काम", "क्रोध", "माया"],
        "deviche_gane": ["अंबा", "भवानी", "जोगवा", "गोंधळ", "आई", "दुर्गे", "तुळजापूर", "कोल्हापूर", "माहूर", "सप्तशृंगी", "कवड्या"],
        "kirtan": ["कीर्तन", "टाळ", "मृदंग", "निरूपण", "श्रवण", "नामघोष", "जयघोष"],
    }

    def extract(self, response: ScrapedResponse, source_def: Optional[SourceDefinition] = None) -> ExtractionResult:
        parser = response.parser
        source_name = source_def.name if source_def else "Web Source"
        authority = source_def.authority_score if source_def else 0.85

        # 1. Determine authorization status based on source permissions
        is_authorized = False
        availability = "not_authorized"
        if source_def:
            if source_def.permits("full_public_domain_lyrics"):
                is_authorized = True
                availability = "public_domain"
            elif source_def.permits("authorized_lyrics"):
                is_authorized = True
                availability = "authorized"
            elif source_def.permits("licensed_lyrics"):
                is_authorized = True
                availability = "authorized"

        # 2. Extract songwriting credits (always permitted factual metadata)
        songwriters = parser.extract_css_all(
            "table.details tr:contains('written by') td a::text",
            [
                "ul.song-credits li:contains('Writer') a::text",
                "span[class*='CreditSubtitle']:contains('Written By') + span a::text",
                ".songwriters a::text",
                "div.credits-section:contains('Written by') li::text",
            ]
        )

        composers = parser.extract_css_all(
            "table.details tr:contains('composed by') td a::text",
            [
                "div.composers a::text",
                "table.wikitable tr:contains('Composer') td a::text",
                "table tr:contains('Music by') td a::text",
            ]
        )

        lyricists = parser.extract_css_all(
            "table.details tr:contains('lyrics by') td a::text",
            [
                "table.wikitable tr:contains('Lyricist') td::text",
                "div.credits-section:contains('Lyrics by') li::text",
            ]
        )

        # 3. Extract lyrics or permitted metadata
        raw_lyrics = None
        sections = []
        rhyme_patterns = {}
        syllable_patterns = []
        repeated_phrases = []
        themes = []

        if is_authorized:
            # Extract from permitted container
            raw_lyrics_html = parser.extract_css(
                "div[class*='Lyrics__Container']",
                [
                    "div.lyrics_box",
                    "p.mxm-lyrics__content",
                    "div#lyrics-body-text",
                    "table.wikitable tr:contains('Text') td",
                ]
            )
            raw_lyrics = clean_lyrics_text(raw_lyrics_html or parser.raw_content)

            if raw_lyrics:
                sections = parse_lyric_sections(raw_lyrics)
                all_lines = [l for sec in sections for l in sec.get("lines", []) if l.strip()]
                if not all_lines:
                    all_lines = [l.strip() for l in raw_lyrics.splitlines() if l.strip()]

                rhyme_patterns = detect_rhyme_scheme(all_lines)
                syllable_patterns = analyze_syllable_pattern(all_lines[:16])  # Sample first 16 lines
                repeated_phrases = detect_repeated_phrases(all_lines)
                themes = self._extract_themes(all_lines)
        else:
            # If not authorized, provide structural hints/labels without full copyrighted lyrics
            section_hints = parser.extract_css_all("span[class*='SectionHeader']::text", ["h3.section-header::text"])
            sections = [{"type": h.strip().lower(), "index": i + 1, "lines": []} for i, h in enumerate(section_hints)]
            availability = "not_authorized"

        return ExtractionResult(
            category=self.category,
            data={
                "songwriting": {
                    "writers": songwriters,
                    "composers": composers,
                    "lyricists": lyricists or songwriters,
                    "arrangers": [],
                },
                "lyrics": {
                    "availability": availability,
                    "authorized_source": source_name if is_authorized else None,
                    "copyright_notice": f"Metadata rights reserved by {source_name}" if not is_authorized else None,
                    "sections": sections,
                    "rhyme_patterns": rhyme_patterns,
                    "syllable_patterns": syllable_patterns,
                    "repeated_phrases": repeated_phrases,
                    "themes": themes,
                },
            },
            source_name=source_name,
            source_url=response.url,
            retrieval_timestamp=response.retrieved_at,
            authority_score=authority,
            confidence_score=0.94 if is_authorized else 0.88,
        )

    def _extract_themes(self, lines: List[str]) -> List[str]:
        full_text = " ".join(lines).lower()
        detected_themes = []
        for theme, keywords in self.THEME_KEYWORDS.items():
            matches = sum(1 for kw in keywords if re.search(rf"\b{kw}\b", full_text))
            if matches >= 2:
                detected_themes.append(theme)
        return detected_themes
