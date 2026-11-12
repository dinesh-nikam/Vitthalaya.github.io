"""Devotional Marathi & Sanskrit Sacred Music Literature Extractor."""

import re
from typing import Dict, Any, List
from engine.extractors.base import BaseExtractor
from engine.scrapling_fetcher import FetchResult
from core.security import sanitize_text, clean_lyrics_text


KNOWN_SAINTS = [
    ("तुकाराम", "Tukaram Maharaj", "tukaram-maharaj"),
    ("ज्ञानेश्वर", "Dnyaneshwar Maharaj", "dnyaneshwar-maharaj"),
    ("नामदेव", "Namdev Maharaj", "namdev-maharaj"),
    ("एकनाथ", "Eknath Maharaj", "eknath-maharaj"),
    ("निवृत्ति", "Nivruttinath Maharaj", "nivruttinath"),
    ("सोपान", "Sopandev", "sopandev"),
    ("मुक्ताबाई", "Muktabai", "muktabai"),
    ("जनाबाई", "Janabai", "janabai"),
    ("चोखामेळा", "Chokhamela", "chokhamela"),
    ("गोरा कुंभार", "Gora Kumbhar", "gora-kumbhar"),
    ("सेना न्हावी", "Sena Nhavi", "sena-nhavi"),
    ("नरहरी सोनार", "Narhari Sonar", "narhari-sonar"),
    ("सांवता माळी", "Savata Mali", "savata-mali"),
    ("कान्होपात्रा", "Kanhopatra", "kanhopatra"),
    ("बहिणाबाई", "Bahinabai", "bahinabai"),
]


class DevotionalMarathiExtractor(BaseExtractor):
    source_id = "devotional_marathi"

    def extract(self, fetch_result: FetchResult, selectors: Dict[str, str]) -> Dict[str, Any]:
        title = self.query_first(fetch_result, selectors.get("title", "h1, .abhang-title, .title"))
        lyrics_text = self.query_first(fetch_result, selectors.get("lyrics", ".lyrics, .abhang-text, pre, .content"))
        
        if not lyrics_text:
            lyrics_text = clean_lyrics_text(fetch_result.text)

        # Detect Saint / Poet attribution from incipit, title, or colophon ("तुका म्हणे", "नामा म्हणे", "ज्ञानदेव म्हणे", "एका जनार्दनी")
        detected_saint = None
        detected_slug = None
        for marathi_name, english_name, slug in KNOWN_SAINTS:
            if lyrics_text and marathi_name in lyrics_text:
                detected_saint = marathi_name
                detected_slug = slug
                break
            if title and marathi_name in title:
                detected_saint = marathi_name
                detected_slug = slug
                break

        # Work classification (Abhang, Haripath, Aarti, Bhajan, etc.)
        work_type = "Abhang"
        text_check = f"{title or ''} {lyrics_text or ''}".lower()
        if "आरती" in text_check or "aarti" in text_check:
            work_type = "Aarti"
        elif "हरिपाठ" in text_check or "haripath" in text_check:
            work_type = "Haripath"
        elif "भजन" in text_check or "bhajan" in text_check:
            work_type = "Bhajan"
        elif "स्तोत्र" in text_check or "stotra" in text_check:
            work_type = "Stotra"
        elif "भारुड" in text_check or "bharud" in text_check:
            work_type = "Bharud"
        elif "गवळण" in text_check or "गाऊळणी" in text_check:
            work_type = "Gaulani"

        # Syllable / Meter estimation
        meter = "Abhang (पारंपारिक चरण)"
        if work_type == "Haripath":
            meter = "Chhanda (हरिपाठ छंद)"
        elif work_type == "Aarti":
            meter = "Aarti Taal (आरती ताल)"

        return {
            "title": title or "Unknown Devotional Composition",
            "title_native": title,
            "work_type": work_type,
            "saint_name_marathi": detected_saint,
            "saint_slug": detected_slug,
            "meter": meter,
            "lyrics": lyrics_text,
            "language": "mr",
            "is_public_domain": True,
            "source_authority": 0.95,
            "raw_url": fetch_result.url,
        }
