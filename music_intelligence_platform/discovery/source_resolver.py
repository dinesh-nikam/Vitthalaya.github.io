"""Source discovery and URL resolution across authoritative music platforms."""

from typing import Dict, List, Optional
from urllib.parse import quote_plus
from config.settings import settings
from discovery.deduplication import clean_song_title
from discovery.source_registry import SourceDefinition, source_registry


class DiscoveredSourceTarget:
    def __init__(self, source: SourceDefinition, query_url: str, priority: int = 1):
        self.source = source
        self.query_url = query_url
        self.priority = priority


class SourceResolver:
    """Discovers target endpoints for song entities across authoritative archives and databases."""

    def __init__(self, registry=source_registry):
        self.registry = registry

    def resolve_targets(
        self,
        title: str,
        artist: Optional[str] = None,
        album: Optional[str] = None,
        direct_url: Optional[str] = None,
    ) -> List[DiscoveredSourceTarget]:
        """Generates prioritized list of query and scrape targets for a given song entity."""
        targets: List[DiscoveredSourceTarget] = []
        clean_t = clean_song_title(title)
        query = f"{clean_t} {artist}" if artist else clean_t
        encoded_query = quote_plus(query)

        # If user supplied a direct URL, map it to matching source or generic web target
        if direct_url:
            matched_src = None
            for src in self.registry.list_sources():
                if src.base_url in direct_url:
                    matched_src = src
                    break
            if not matched_src:
                matched_src = SourceDefinition({
                    "id": "direct_url_source",
                    "name": "User-Provided Direct URL",
                    "base_url": direct_url,
                    "authority_score": 0.85,
                    "permitted_content": ["basic_metadata", "songwriting_credits", "authorized_lyrics"],
                })
            targets.append(DiscoveredSourceTarget(matched_src, direct_url, priority=0))

        # 1. MusicBrainz (Metadata, credits, ISRC, release dates)
        mb = self.registry.get("musicbrainz")
        if mb:
            mb_url = f"https://musicbrainz.org/ws/2/recording?query=recording:{quote_plus(clean_t)}"
            if artist:
                mb_url += f"%20AND%20artist:{quote_plus(artist)}"
            mb_url += "&fmt=json"
            targets.append(DiscoveredSourceTarget(mb, mb_url, priority=1))

        # 2. Discogs (Recording credits, producers, instruments)
        discogs = self.registry.get("discogs")
        if discogs:
            targets.append(DiscoveredSourceTarget(
                discogs,
                f"https://www.discogs.com/search/?q={encoded_query}&type=release",
                priority=2
            ))

        # 3. Genius (Songwriting credits, producers, authorized lyrics)
        genius = self.registry.get("genius")
        if genius:
            targets.append(DiscoveredSourceTarget(
                genius,
                f"https://genius.com/api/search/multi?q={encoded_query}",
                priority=3
            ))

        # 4. Chordify (Chords, key, tempo BPM)
        chordify = self.registry.get("chordify")
        if chordify:
            targets.append(DiscoveredSourceTarget(
                chordify,
                f"https://chordify.net/search/{encoded_query}",
                priority=4
            ))

        # 5. Public domain archives (IMSLP / ChoralWiki if applicable or classical/choral)
        imslp = self.registry.get("imslp")
        if imslp:
            targets.append(DiscoveredSourceTarget(
                imslp,
                f"https://imslp.org/wiki/Special:Search?search={encoded_query}",
                priority=5
            ))

        return targets


# Global resolver singleton
source_resolver = SourceResolver()
