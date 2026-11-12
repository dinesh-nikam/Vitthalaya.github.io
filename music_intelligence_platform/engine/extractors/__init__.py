"""Extractor registry and factory."""

from typing import Dict, Type
from engine.extractors.base import BaseExtractor
from engine.extractors.musicbrainz import MusicBrainzExtractor
from engine.extractors.discogs import DiscogsExtractor
from engine.extractors.allmusic import AllMusicExtractor
from engine.extractors.songfacts import SongfactsExtractor
from engine.extractors.genius import GeniusExtractor
from engine.extractors.devotional_marathi import DevotionalMarathiExtractor

EXTRACTOR_REGISTRY: Dict[str, Type[BaseExtractor]] = {
    "musicbrainz": MusicBrainzExtractor,
    "discogs": DiscogsExtractor,
    "allmusic": AllMusicExtractor,
    "songfacts": SongfactsExtractor,
    "genius": GeniusExtractor,
    "wikisource": DevotionalMarathiExtractor,
    "santsahitya": DevotionalMarathiExtractor,
    "abhangvani": DevotionalMarathiExtractor,
    "bhajangeet": DevotionalMarathiExtractor,
    "devotional_marathi": DevotionalMarathiExtractor,
}


def get_extractor(source_id: str) -> BaseExtractor:
    """Returns the extractor instance for the given source ID, defaulting to DevotionalMarathiExtractor."""
    cls = EXTRACTOR_REGISTRY.get(source_id.lower(), DevotionalMarathiExtractor)
    return cls()
