"""Musicological & Lyrical Intelligence Analyzer."""

import re
from typing import List, Dict, Any, Optional
from schemas.lyrics import VerseSegment, LyricsAnalysisResponse
from schemas.intelligence import MusicologicalProfile


THEMATIC_KEYWORD_MAP = {
    "विठ्ठल": ["Vitthal", "Pandharpur", "Hari", "Bhakti"],
    "पांडुरंग": ["Pandurang", "Vitthal", "Bhakti"],
    "ज्ञानदेव": ["Dnyaneshwar", "Advaita", "Vedanta"],
    "तुका": ["Tukaram", "Social Equality", "Nama-Smaran"],
    "नामा": ["Namdev", "Kirtan", "Nama-Smaran"],
    "एकनाथ": ["Eknath", "Bhagwat", "Bhakti"],
    "हरी": ["Hari", "Vishnu", "Devotion"],
    "पंढरी": ["Pandharpur", "Wari", "Pilgrimage"],
    "चंद्रभागा": ["Chandrabhaga", "Sacred River", "Pandharpur"],
    "चरण": ["Surrender", "Sharanagati"],
    "मोक्ष": ["Moksha", "Liberation", "Philosophy"],
    "आनंद": ["Bliss", "Ananda", "Joy"],
    "love": ["Love", "Romance"],
    "heart": ["Emotion", "Longing"],
    "soul": ["Spiritual", "Introspection"],
    "freedom": ["Liberty", "Freedom"],
}

RAGA_MOOD_MAP = {
    "bhairavi": ("Bhairavi", "Morning / Devotional / Peaceful", "Shanta / Bhakti", "Bhajani Taal"),
    "yaman": ("Yaman", "Evening / Serene / Romantic", "Shringar / Shanta", "Teentaal"),
    "bhupali": ("Bhupali", "Morning / Pious / Awakening", "Bhakti / Shanta", "Bhajani Taal / Roopak"),
    "desh": ("Desh", "Monsoon / Patriotic / Longing", "Karuna / Shringar", "Keherwa"),
    "kafi": ("Kafi", "Hori / Spring / Folk Devotional", "Hasya / Shringar", "Dadra"),
    "khamaj": ("Khamaj", "Sensual / Light Classical / Thumri", "Shringar", "Deepchandi"),
    "darbari": ("Darbari Kanada", "Midnight / Majestic / Solemn", "Gambhira / Karuna", "Chautaal"),
}


class MusicAnalyzer:
    """Performs deep computational analysis on lyrics, meter, rhyme, and musicological characteristics."""

    @staticmethod
    def detect_script_and_language(text: str) -> Dict[str, str]:
        """Detects primary script and language of the lyrics."""
        devanagari_chars = len(re.findall(r"[\u0900-\u097F]", text))
        latin_chars = len(re.findall(r"[A-Za-z]", text))

        if devanagari_chars > latin_chars:
            script = "Devanagari"
            # Distinguish Marathi vs Hindi vs Sanskrit heuristically
            if any(w in text for w in ["आहे", "होते", "म्हणे", "झाला", "नाही", "पंढरी", "तुका"]):
                lang = "mr"
            elif any(w in text for w in ["है", "था", "नहीं", "करना", "होगा"]):
                lang = "hi"
            elif any(w in text for w in ["नमः", "स्वाहा", "भवति", "इति"]):
                lang = "sa"
            else:
                lang = "mr"
        else:
            script = "Latin"
            lang = "en"

        return {"language": lang, "script": script}

    @staticmethod
    def segment_verses(text: str) -> List[VerseSegment]:
        """Splits raw lyric text into structured verse segments with syllable estimation."""
        raw_stanzas = re.split(r"\n\s*\n+", text.strip())
        segments: List[VerseSegment] = []

        for i, stanza in enumerate(raw_stanzas, start=1):
            lines = [re.sub(r"\s+", " ", line).strip() for line in stanza.splitlines() if line.strip()]
            if not lines:
                continue

            # Estimate syllables per line (rough count based on vowels / devanagari matras)
            syllables = []
            for line in lines:
                vowel_count = len(re.findall(r"[\u0904-\u0914\u093E-\u094C\u0902]|[aeiouy]", line, re.IGNORECASE))
                syllables.append(max(vowel_count, 1))

            stanza_type = "stanza"
            if i == 1 and len(lines) <= 2:
                stanza_type = "dhrpad"  # Refrain / Chorus
            elif any(re.search(r"\b(chorus|refrain|धृपद)\b", line, re.IGNORECASE) for line in lines):
                stanza_type = "chorus"

            segments.append(
                VerseSegment(
                    verse_number=i,
                    lines=lines,
                    stanza_type=stanza_type,
                    syllable_counts=syllables,
                )
            )

        return segments

    @staticmethod
    def detect_meter(segments: List[VerseSegment], script: str) -> str:
        """Determines the poetic meter based on line count, stanza structure, and syllables."""
        if not segments:
            return "Free Verse"

        first_seg = segments[0]
        line_count = len(first_seg.lines)

        if script == "Devanagari":
            if line_count == 4:
                # Typical Abhang (४ चरण: ६-६-६-४ किंवा ८-८-८-४ अक्षरे)
                return "Abhang (पारंपरिक चार चरणी अभंग)"
            elif line_count == 3:
                # Typical Ovi (३ संपूर्ण चरण + १ अपूर्ण चरण)
                return "Ovi (पारंपरिक त्रिचरणी ओवी)"
            elif line_count == 2:
                return "Doha / Shloka (द्विपदी छंद)"
            else:
                return "Devotional Geet (भक्ती रचना)"
        else:
            if line_count == 4:
                return "Quatrain (AABB/ABAB)"
            elif line_count == 2:
                return "Couplet"
            else:
                return "Free Verse / Contemporary"

    @staticmethod
    def analyze_rhyme_scheme(segments: List[VerseSegment]) -> str:
        """Estimates end-rhyme scheme across lines of the primary stanzas."""
        if not segments:
            return "Free"

        lines = segments[0].lines
        if len(lines) < 2:
            return "Unrhymed"

        def get_ending_sound(line: str) -> str:
            clean = re.sub(r"[^\w\u0900-\u097F]", "", line.lower())
            return clean[-2:] if len(clean) >= 2 else clean

        endings = [get_ending_sound(l) for l in lines]
        
        if len(endings) == 4:
            if endings[0] == endings[1] and endings[2] == endings[3]:
                return "AABB"
            elif endings[0] == endings[2] and endings[1] == endings[3]:
                return "ABAB"
            elif endings[0] == endings[1] == endings[2]:
                return "AAAB"
            elif endings[0] == endings[1] == endings[2] == endings[3]:
                return "AAAA"

        return "Devotional Cadence (अंत्ययमक)"

    @classmethod
    def analyze_lyrics(cls, text: str) -> LyricsAnalysisResponse:
        """Full analysis pipeline for song or devotional lyrics."""
        meta = cls.detect_script_and_language(text)
        segments = cls.segment_verses(text)
        total_verses = len(segments)
        total_lines = sum(len(s.lines) for s in segments)
        total_words = len(re.findall(r"\w+", text))

        meter = cls.detect_meter(segments, meta["script"])
        rhyme = cls.analyze_rhyme_scheme(segments)

        # Thematic tagging
        tags: List[str] = []
        for kw, kw_tags in THEMATIC_KEYWORD_MAP.items():
            if kw in text.lower():
                tags.extend(kw_tags)
        unique_tags = list(dict.fromkeys(tags))

        sentiment = "Bhakti & Contemplative" if meta["script"] == "Devanagari" else "Expressive"

        return LyricsAnalysisResponse(
            total_verses=total_verses,
            total_lines=total_lines,
            total_words=total_words,
            detected_language=meta["language"],
            detected_script=meta["script"],
            rhyme_scheme=rhyme,
            meter=meter,
            verse_segments=segments,
            sentiment_or_mood=sentiment,
            thematic_tags=unique_tags[:8],
        )

    @classmethod
    def profile_composition(cls, title: str, text: Optional[str] = None, raga_hint: Optional[str] = None) -> MusicologicalProfile:
        """Generates a complete musicological profile including suggested raga, taal, and instruments."""
        full_context = f"{title} {text or ''}".lower()

        matched_raga = None
        for key, profile in RAGA_MOOD_MAP.items():
            if (raga_hint and key in raga_hint.lower()) or key in full_context:
                matched_raga = profile
                break

        if not matched_raga:
            matched_raga = RAGA_MOOD_MAP["bhairavi"]  # Default devotional raga

        raga_name, tempo_range, rasa, taal = matched_raga

        return MusicologicalProfile(
            raga_or_scale=raga_name,
            thaat="Bhairavi Thaat" if "Bhairavi" in raga_name else "Bilawal Thaat",
            meter="Abhang Chhanda" if any(k in full_context for k in ["abhang", "अभंग"]) else "4/4 Taal",
            tempo_bpm_range=tempo_range,
            traditional_taal=taal,
            primary_rasa=rasa,
            instruments_suggested=["Veena", "Mridang / Pakhawaj", "Taal (Manjira)", "Harmonium", "Tanpura"],
            thematic_cluster=["Devotion", "Surrender", "Divine Grace"],
        )


music_analyzer = MusicAnalyzer()
