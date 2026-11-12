"""Category C: Musical Composition & Harmonic Intelligence Extractor."""

import logging
import re
from typing import Any, Dict, List, Optional

from discovery.source_registry import SourceDefinition
from extractors.base_extractor import BaseExtractor, ExtractionResult
from musicology.analyzer import (
    classify_tempo,
    compute_roman_numerals,
    estimate_key_from_chords,
)
from scrapling_engine.fetcher_manager import ScrapedResponse

logger = logging.getLogger("music_intelligence.extractor.composition")


class CompositionExtractor(BaseExtractor):
    """Extracts Category C Musical Composition, Harmony, Meter, and Arrangement."""

    category: str = "musical_composition"

    def extract(self, response: ScrapedResponse, source_def: Optional[SourceDefinition] = None) -> ExtractionResult:
        parser = response.parser
        source_name = source_def.name if source_def else "Web Source"
        authority = source_def.authority_score if source_def else 0.85

        # 1. Key extraction (source fact)
        source_key = parser.extract_css(
            "span[data-key]::text",
            [
                "table.wp_info tr:contains('Key') td::text",
                ".song-key-badge::text",
                "table tr:contains('Key') td::text",
                "div.metadata-key::text",
            ]
        )

        # 2. BPM / Tempo extraction (source fact)
        bpm_str = parser.extract_css(
            "span[data-bpm]::text",
            [
                ".song-bpm-badge::text",
                "table tr:contains('BPM') td::text",
                "span.tempo::text",
            ]
        )
        bpm: Optional[float] = None
        if bpm_str:
            bpm_match = re.search(r"(\d+(?:\.\d+)?)", bpm_str)
            if bpm_match:
                bpm = float(bpm_match.group(1))

        # 3. Time Signature
        time_sig = parser.extract_css(
            "table.wp_info tr:contains('Time signature') td::text",
            [
                "table tr:contains('Meter') td::text",
                "span.meter::text",
            ]
        ) or "4/4"

        # 4. Chords progression
        chords_raw = parser.extract_css_all(
            "div.chord-block .chord-label::text",
            [
                "span.chord::text",
                ".chords-list span::text",
                "div.chord::text",
            ]
        )
        chord_progression = [c.strip() for c in chords_raw if c.strip()][:16]

        # 5. Distinguish source-provided facts vs algorithmic estimation
        is_estimated = False
        estimation_algo = None
        estimation_conf = None
        final_key = source_key

        if not final_key and chord_progression:
            # Algorithmic key estimation
            est_key, est_conf = estimate_key_from_chords(chord_progression)
            if est_key:
                final_key = est_key
                is_estimated = True
                estimation_algo = "HarmonicDiatonicScorer"
                estimation_conf = est_conf

        # Harmonic analysis
        harmonic_analysis = {}
        if final_key and chord_progression:
            roman_numerals = compute_roman_numerals(chord_progression, final_key)
            harmonic_analysis = {
                "key_analyzed": final_key,
                "roman_numerals": roman_numerals,
                "cadence_pattern": f"{roman_numerals[-2]} - {roman_numerals[-1]}" if len(roman_numerals) >= 2 else None,
            }

        # Instrumentation
        instruments = parser.extract_css_all(
            "table.wp_info tr:contains('Instrumentation') td::text",
            [
                "table tr:contains('Instruments') td::text",
                "div.instrumentation li::text",
                "span.instrument::text",
            ]
        )

        # Musical arrangement & structure
        structure_sections = parser.extract_css_all(
            "div.song-structure span::text",
            [
                "ul.structure-list li::text",
                "div.sections-map span::text",
            ]
        )
        if not structure_sections:
            structure_sections = ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"]

        # Melodic & Vocal characteristics
        vocal_characteristics = parser.extract_css(
            "table tr:contains('Vocal Style') td::text",
            ["div.vocal-info::text", "span.voice-type::text"]
        )
        rhythmic_patterns = parser.extract_css(
            "table tr:contains('Rhythm') td::text",
            ["div.rhythm-info::text", "span.groove::text"]
        )

        return ExtractionResult(
            category=self.category,
            data={
                "composition": {
                    "key": final_key,
                    "scale_type": "Major" if (final_key and "minor" not in final_key.lower()) else "Minor",
                    "bpm": bpm,
                    "time_signature": time_sig,
                    "chord_progression": chord_progression,
                    "harmonic_analysis": harmonic_analysis,
                    "instruments": instruments,
                    "structure": structure_sections,
                    "melody_characteristics": f"Tempo marking: {classify_tempo(bpm)}",
                    "vocal_characteristics": vocal_characteristics,
                    "rhythmic_patterns": rhythmic_patterns or f"Meter {time_sig}",
                    "dynamic_changes": "Moderate dynamic transitions between verse and chorus",
                    "is_estimated": is_estimated,
                    "estimation_algorithm": estimation_algo,
                    "estimation_confidence": estimation_conf,
                }
            },
            source_name=source_name,
            source_url=response.url,
            retrieval_timestamp=response.retrieved_at,
            authority_score=authority,
            confidence_score=0.95 if not is_estimated else (estimation_conf or 0.75),
        )
