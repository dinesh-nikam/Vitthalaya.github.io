"""End-to-end 9-step intelligent research and data extraction pipeline."""

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from core.database import async_session_scope
from core.exceptions import ExtractionError
from discovery.deduplication import clean_song_title, is_same_song, normalize_string
from discovery.source_registry import SourceDefinition, source_registry
from discovery.source_resolver import SourceResolver, source_resolver
from extractors.artist_extractor import ArtistIntelligenceExtractor
from extractors.base_extractor import ExtractionResult
from extractors.composition_extractor import CompositionExtractor
from extractors.lyrics_extractor import LyricsExtractor
from extractors.metadata_extractor import SongMetadataExtractor
from extractors.production_extractor import ProductionExtractor
from models.domain import (
    Album,
    Artist,
    Composer,
    Genre,
    Instrument,
    Lyric,
    MusicalCharacteristic,
    Producer,
    RecordingCredit,
    ScrapingHistory,
    Song,
    Songwriter,
    Source,
)
from models.schemas import (
    CompositionSchema,
    LyricsSchema,
    ProductionSchema,
    SingleSongScrapeRequest,
    SongIntelligenceResponse,
    SongMetadataSchema,
    SongwritingSchema,
    SourceAttributionSchema,
)
from musicology.confidence_engine import FieldObservation, confidence_engine
from scrapling_engine.fetcher_manager import ScrapedResponse, fetcher_manager
from sqlalchemy import select
from sqlalchemy.orm import selectinload

logger = logging.getLogger("music_intelligence.pipeline")


class MusicIntelligencePipeline:
    """Orchestrates the 9-stage intelligence process:

    1. Discover relevant sources
    2. Scrape permitted content with Scrapling
    3. Clean and normalize extracted data
    4. Identify song and artist entities
    5. Resolve duplicate records
    6. Cross-reference multiple sources
    7. Identify conflicting information
    8. Assign confidence scores
    9. Store structured results
    """

    def __init__(self):
        self.metadata_extractor = SongMetadataExtractor()
        self.lyrics_extractor = LyricsExtractor()
        self.composition_extractor = CompositionExtractor()
        self.production_extractor = ProductionExtractor()
        self.artist_extractor = ArtistIntelligenceExtractor()

    async def execute(self, req: SingleSongScrapeRequest) -> SongIntelligenceResponse:
        logger.info(f"Initiating pipeline for: '{req.title}' by '{req.artist or 'Unknown'}'")

        # Step 1: Discovers relevant sources
        targets = source_resolver.resolve_targets(
            title=req.title,
            artist=req.artist,
            album=req.album,
            direct_url=req.url,
        )

        extraction_results: List[ExtractionResult] = []
        attributions: List[SourceAttributionSchema] = []

        # Step 2: Scrapes permitted content with Scrapling
        for target in targets:
            src_def = target.source
            try:
                logger.debug(f"Querying source [{src_def.name}]: {target.query_url}")
                response = await fetcher_manager.fetch(
                    url=target.query_url,
                    requires_js=src_def.requires_js,
                )

                # Record scraping history
                await self._record_history(
                    url=target.query_url,
                    status="success",
                    status_code=response.status_code,
                    fetcher=response.fetcher_type,
                    exec_time=response.execution_time,
                )

                # Execute category extractors permitted by source
                if src_def.permits("basic_metadata"):
                    res = self.metadata_extractor.extract(response, src_def)
                    extraction_results.append(res)
                    attributions.append(SourceAttributionSchema(**res.to_attribution()))

                if src_def.permits("songwriting_credits") or src_def.permits("authorized_lyrics") or src_def.permits("full_public_domain_lyrics"):
                    res = self.lyrics_extractor.extract(response, src_def)
                    extraction_results.append(res)
                    attributions.append(SourceAttributionSchema(**res.to_attribution()))

                if (
                    src_def.permits("musical_composition")
                    or src_def.permits("harmonic_analysis")
                    or src_def.permits("musical_key")
                    or src_def.permits("chord_progression")
                    or src_def.permits("bpm")
                ):
                    res = self.composition_extractor.extract(response, src_def)
                    extraction_results.append(res)
                    attributions.append(SourceAttributionSchema(**res.to_attribution()))

                if src_def.permits("production_credits") or src_def.permits("recording_credits"):
                    res = self.production_extractor.extract(response, src_def)
                    extraction_results.append(res)
                    attributions.append(SourceAttributionSchema(**res.to_attribution()))

            except Exception as exc:
                logger.warning(f"Error scraping {target.query_url}: {exc}")
                await self._record_history(
                    url=target.query_url,
                    status="failed",
                    error=str(exc),
                )
                continue

        # Step 3, 4, 5, 6, 7, 8: Clean, Resolve, Cross-reference, Confidences
        resolved_data, confidences, conflicts = self._cross_reference_and_score(
            req=req,
            results=extraction_results,
        )

        response_payload = SongIntelligenceResponse(
            song=SongMetadataSchema(**resolved_data["song"]),
            songwriting=SongwritingSchema(**resolved_data["songwriting"]),
            composition=CompositionSchema(**resolved_data["composition"]),
            production=ProductionSchema(**resolved_data["production"]),
            lyrics=LyricsSchema(**resolved_data["lyrics"]),
            sources=attributions,
            confidence=confidences,
            conflicts_detected=conflicts,
            last_updated=datetime.now(timezone.utc).isoformat(),
        )

        # Step 9: Store structured results in database
        try:
            await self._persist_to_database(response_payload, attributions)
        except Exception as exc:
            logger.error(f"Database persistence error: {exc}", exc_info=True)

        return response_payload

    def _cross_reference_and_score(
        self,
        req: SingleSongScrapeRequest,
        results: List[ExtractionResult],
    ) -> tuple[Dict[str, Any], Dict[str, float], List[Dict[str, Any]]]:
        """Steps 3-8: Normalizes, cross-references across sources, detects conflicts, and computes confidence scores."""
        conflicts: List[Dict[str, Any]] = []
        confidences: Dict[str, float] = {}

        # Collect observations per field
        title_obs = [FieldObservation(req.title, "User Request", 0.90)]
        artist_obs = [FieldObservation(req.artist, "User Request", 0.90)] if req.artist else []
        album_obs = [FieldObservation(req.album, "User Request", 0.80)] if req.album else []
        release_date_obs = []
        genre_obs = [FieldObservation(req.genre, "User Request", 0.80)] if req.genre else []
        duration_obs = []
        isrc_obs = []

        writers_obs = []
        composers_obs = []
        lyricists_obs = []

        key_obs = []
        bpm_obs = []
        time_sig_obs = []
        chords_obs = []
        instruments_obs = []

        producers_obs = []
        mixing_obs = []
        mastering_obs = []
        studios_obs = []

        lyrics_data = {
            "availability": "not_authorized",
            "authorized_source": None,
            "sections": [],
            "rhyme_patterns": {},
            "syllable_patterns": [],
            "repeated_phrases": [],
            "themes": [],
        }

        for r in results:
            d = r.data
            if r.category == "basic_metadata":
                if d.get("title"):
                    title_obs.append(FieldObservation(d["title"], r.source_name, r.authority_score))
                if d.get("artist"):
                    artist_obs.append(FieldObservation(d["artist"], r.source_name, r.authority_score))
                if d.get("album"):
                    album_obs.append(FieldObservation(d["album"], r.source_name, r.authority_score))
                if d.get("release_date"):
                    release_date_obs.append(FieldObservation(d["release_date"], r.source_name, r.authority_score))
                if d.get("genre"):
                    genre_obs.append(FieldObservation(d["genre"], r.source_name, r.authority_score))
                if d.get("duration"):
                    duration_obs.append(FieldObservation(d["duration"], r.source_name, r.authority_score))
                if d.get("isrc"):
                    isrc_obs.append(FieldObservation(d["isrc"], r.source_name, r.authority_score))

            elif r.category == "lyrics_and_songwriting":
                sw = d.get("songwriting", {})
                if sw.get("writers"):
                    writers_obs.append(FieldObservation(sw["writers"], r.source_name, r.authority_score))
                if sw.get("composers"):
                    composers_obs.append(FieldObservation(sw["composers"], r.source_name, r.authority_score))
                if sw.get("lyricists"):
                    lyricists_obs.append(FieldObservation(sw["lyricists"], r.source_name, r.authority_score))

                lyr = d.get("lyrics", {})
                if lyr.get("availability") in ("authorized", "public_domain"):
                    lyrics_data = lyr

            elif r.category == "musical_composition":
                comp = d.get("composition", {})
                if comp.get("key"):
                    key_obs.append(FieldObservation(
                        comp["key"], r.source_name, r.authority_score, is_estimated=comp.get("is_estimated", False)
                    ))
                if comp.get("bpm"):
                    bpm_obs.append(FieldObservation(comp["bpm"], r.source_name, r.authority_score))
                if comp.get("time_signature"):
                    time_sig_obs.append(FieldObservation(comp["time_signature"], r.source_name, r.authority_score))
                if comp.get("chord_progression"):
                    chords_obs.append(FieldObservation(comp["chord_progression"], r.source_name, r.authority_score))
                if comp.get("instruments"):
                    instruments_obs.append(FieldObservation(comp["instruments"], r.source_name, r.authority_score))

            elif r.category == "production_and_recording":
                prod = d.get("production", {})
                if prod.get("producer"):
                    producers_obs.append(FieldObservation(prod["producer"], r.source_name, r.authority_score))
                if prod.get("mixing_engineer"):
                    mixing_obs.append(FieldObservation(prod["mixing_engineer"], r.source_name, r.authority_score))
                if prod.get("mastering_engineer"):
                    mastering_obs.append(FieldObservation(prod["mastering_engineer"], r.source_name, r.authority_score))
                if prod.get("recording_studio"):
                    studios_obs.append(FieldObservation(prod["recording_studio"], r.source_name, r.authority_score))

        # Resolve Single Fields with Conflict Detection
        resolved_title, conf_title, conf_c = confidence_engine.resolve_field("title", title_obs)
        if conf_c: conflicts.append(conf_c)
        confidences["title"] = conf_title

        resolved_artist, conf_artist, conf_c = confidence_engine.resolve_field("artist", artist_obs)
        if conf_c: conflicts.append(conf_c)
        confidences["artist"] = conf_artist

        resolved_album, conf_album, conf_c = confidence_engine.resolve_field("album", album_obs)
        if conf_c: conflicts.append(conf_c)
        confidences["album"] = conf_album

        resolved_date, conf_date, conf_c = confidence_engine.resolve_field("release_date", release_date_obs)
        if conf_c: conflicts.append(conf_c)
        confidences["release_date"] = conf_date

        resolved_genre, conf_genre, conf_c = confidence_engine.resolve_field("genre", genre_obs)
        if conf_c: conflicts.append(conf_c)
        confidences["genre"] = conf_genre

        resolved_dur, conf_dur, _ = confidence_engine.resolve_field("duration", duration_obs)
        confidences["duration"] = conf_dur

        resolved_isrc, conf_isrc, _ = confidence_engine.resolve_field("isrc", isrc_obs)
        confidences["isrc"] = conf_isrc

        resolved_key, conf_key, conf_c = confidence_engine.resolve_field("key", key_obs)
        if conf_c: conflicts.append(conf_c)
        confidences["key"] = conf_key

        resolved_bpm, conf_bpm, conf_c = confidence_engine.resolve_field("bpm", bpm_obs)
        if conf_c: conflicts.append(conf_c)
        confidences["bpm"] = conf_bpm

        resolved_ts, conf_ts, _ = confidence_engine.resolve_field("time_signature", time_sig_obs)
        confidences["time_signature"] = conf_ts

        # Resolve List Fields
        resolved_writers, conf_w = confidence_engine.resolve_list_field("writers", writers_obs)
        confidences["writers"] = conf_w

        resolved_composers, conf_comp = confidence_engine.resolve_list_field("composers", composers_obs)
        confidences["composers"] = conf_comp

        resolved_lyricists, conf_lyr = confidence_engine.resolve_list_field("lyricists", lyricists_obs)
        confidences["lyricists"] = conf_lyr

        resolved_chords, conf_chords = confidence_engine.resolve_list_field("chord_progression", chords_obs)
        confidences["chord_progression"] = conf_chords

        resolved_instruments, conf_inst = confidence_engine.resolve_list_field("instruments", instruments_obs)
        confidences["instruments"] = conf_inst

        resolved_producers, conf_prod = confidence_engine.resolve_list_field("producer", producers_obs)
        confidences["producer"] = conf_prod

        resolved_mix, _ = confidence_engine.resolve_list_field("mixing_engineer", mixing_obs)
        resolved_master, _ = confidence_engine.resolve_list_field("mastering_engineer", mastering_obs)
        resolved_studios, _ = confidence_engine.resolve_list_field("recording_studio", studios_obs)

        resolved_payload = {
            "song": {
                "title": resolved_title or req.title,
                "artist": resolved_artist or req.artist or "Unknown Artist",
                "featured_artists": [],
                "album": resolved_album or req.album or "",
                "release_date": resolved_date or "",
                "genre": resolved_genre or req.genre or "",
                "subgenre": None,
                "duration": resolved_dur or "",
                "language": "en",
                "record_label": "",
                "isrc": resolved_isrc,
            },
            "songwriting": {
                "writers": resolved_writers,
                "composers": resolved_composers,
                "lyricists": resolved_lyricists,
                "arrangers": [],
            },
            "composition": {
                "key": resolved_key,
                "bpm": resolved_bpm,
                "time_signature": resolved_ts or "4/4",
                "chord_progression": resolved_chords,
                "instruments": resolved_instruments,
                "structure": ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"],
                "is_estimated": False,
            },
            "production": {
                "producer": resolved_producers,
                "executive_producer": [],
                "recording_engineer": [],
                "mixing_engineer": resolved_mix,
                "mastering_engineer": resolved_master,
                "recording_studio": resolved_studios,
                "performers": {},
            },
            "lyrics": lyrics_data,
        }

        return resolved_payload, confidences, conflicts

    async def _persist_to_database(
        self,
        item: SongIntelligenceResponse,
        attributions: List[SourceAttributionSchema],
    ) -> None:
        """Step 9: Persists entities, songs, lyrics, and credits into relational tables."""
        async with async_session_scope() as session:
            # 1. Resolve or Create Artist
            artist_name = item.song.artist
            norm_artist = normalize_string(artist_name)
            stmt = select(Artist).where(Artist.normalized_name == norm_artist)
            res = await session.execute(stmt)
            artist_entity = res.scalar_one_or_none()

            if not artist_entity:
                artist_entity = Artist(
                    name=artist_name,
                    normalized_name=norm_artist,
                )
                session.add(artist_entity)
                await session.flush()

            # 2. Resolve or Create Album
            album_entity = None
            if item.song.album:
                norm_album = normalize_string(item.song.album)
                stmt = select(Album).where(Album.normalized_title == norm_album, Album.artist_id == artist_entity.id)
                res = await session.execute(stmt)
                album_entity = res.scalar_one_or_none()
                if not album_entity:
                    album_entity = Album(
                        title=item.song.album,
                        normalized_title=norm_album,
                        artist_id=artist_entity.id,
                        release_date=item.song.release_date,
                    )
                    session.add(album_entity)
                    await session.flush()

            # 3. Resolve or Create Song
            norm_title = normalize_string(clean_song_title(item.song.title))
            stmt = (
                select(Song)
                .where(Song.normalized_title == norm_title, Song.primary_artist_id == artist_entity.id)
                .options(
                    selectinload(Song.songwriters),
                    selectinload(Song.composers),
                    selectinload(Song.producers),
                )
            )
            res = await session.execute(stmt)
            song_entity = res.scalar_one_or_none()

            if not song_entity:
                song_entity = Song(
                    title=item.song.title,
                    normalized_title=norm_title,
                    primary_artist_id=artist_entity.id,
                    album_id=album_entity.id if album_entity else None,
                    release_date=item.song.release_date,
                    genre=item.song.genre,
                    duration=item.song.duration,
                    language=item.song.language,
                    isrc=item.song.isrc,
                    confidence=item.confidence,
                )
                song_entity.songwriters = []
                song_entity.composers = []
                song_entity.producers = []
                session.add(song_entity)
                await session.flush()
            else:
                # Update existing song record
                song_entity.release_date = item.song.release_date or song_entity.release_date
                song_entity.genre = item.song.genre or song_entity.genre
                song_entity.confidence = item.confidence
                song_entity.last_updated = datetime.now(timezone.utc)

            # 4. Save Musical Characteristics
            stmt = select(MusicalCharacteristic).where(MusicalCharacteristic.song_id == song_entity.id)
            res = await session.execute(stmt)
            mc = res.scalar_one_or_none()
            if not mc:
                mc = MusicalCharacteristic(
                    song_id=song_entity.id,
                    key=item.composition.key,
                    bpm=item.composition.bpm,
                    time_signature=item.composition.time_signature,
                    chord_progression=item.composition.chord_progression,
                    harmonic_structure=item.composition.harmonic_analysis,
                    structure_sections=item.composition.structure,
                    is_estimated=item.composition.is_estimated,
                )
                session.add(mc)

            # 5. Save Lyrics
            stmt = select(Lyric).where(Lyric.song_id == song_entity.id)
            res = await session.execute(stmt)
            lyric_row = res.scalar_one_or_none()
            if not lyric_row:
                lyric_row = Lyric(
                    song_id=song_entity.id,
                    availability=item.lyrics.availability,
                    authorized_source=item.lyrics.authorized_source,
                    sections=[s.model_dump() for s in item.lyrics.sections],
                    rhyme_patterns=item.lyrics.rhyme_patterns,
                    syllable_patterns=item.lyrics.syllable_patterns,
                    repeated_phrases=item.lyrics.repeated_phrases,
                    lyrical_themes=item.lyrics.themes,
                )
                session.add(lyric_row)

            # 6. Songwriters & Composers
            for writer_name in item.songwriting.writers:
                w_norm = writer_name.strip()
                if not w_norm:
                    continue
                stmt = select(Songwriter).where(Songwriter.name == w_norm)
                w_row = (await session.execute(stmt)).scalar_one_or_none()
                if not w_row:
                    w_row = Songwriter(name=w_norm)
                    session.add(w_row)
                    await session.flush()
                if w_row not in song_entity.songwriters:
                    song_entity.songwriters.append(w_row)

            for comp_name in item.songwriting.composers:
                c_norm = comp_name.strip()
                if not c_norm:
                    continue
                stmt = select(Composer).where(Composer.name == c_norm)
                c_row = (await session.execute(stmt)).scalar_one_or_none()
                if not c_row:
                    c_row = Composer(name=c_norm)
                    session.add(c_row)
                    await session.flush()
                if c_row not in song_entity.composers:
                    song_entity.composers.append(c_row)

            # 7. Producers
            for prod_name in item.production.producer:
                p_norm = prod_name.strip()
                if not p_norm:
                    continue
                stmt = select(Producer).where(Producer.name == p_norm)
                p_row = (await session.execute(stmt)).scalar_one_or_none()
                if not p_row:
                    p_row = Producer(name=p_norm)
                    session.add(p_row)
                    await session.flush()
                if p_row not in song_entity.producers:
                    song_entity.producers.append(p_row)

    async def _record_history(
        self,
        url: str,
        status: str,
        status_code: Optional[int] = None,
        fetcher: str = "Fetcher",
        exec_time: float = 0.0,
        error: Optional[str] = None,
    ) -> None:
        try:
            async with async_session_scope() as session:
                entry = ScrapingHistory(
                    url=url,
                    status=status,
                    http_status=status_code,
                    fetcher_used=fetcher,
                    execution_time_seconds=exec_time,
                    error_message=error,
                )
                session.add(entry)
        except Exception:
            pass


# Global pipeline singleton
music_pipeline = MusicIntelligencePipeline()
