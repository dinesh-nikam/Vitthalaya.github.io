"""Music catalog service for search, filtering, and detailed song intelligence retrieval."""

from typing import Any, Dict, List, Optional
from core.database import async_session_scope
from models.domain import (
    Album,
    Artist,
    Composer,
    Lyric,
    MusicalCharacteristic,
    Producer,
    RecordingCredit,
    Song,
    Songwriter,
)
from models.schemas import (
    CompositionSchema,
    LyricsSchema,
    ProductionSchema,
    SongIntelligenceResponse,
    SongMetadataSchema,
    SongSearchFilter,
    SongwritingSchema,
)
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload


class MusicService:
    """Provides high-level database query and lookup operations."""

    async def search_songs(self, filters: SongSearchFilter) -> Dict[str, Any]:
        async with async_session_scope() as session:
            stmt = (
                select(Song)
                .join(Artist, Song.primary_artist_id == Artist.id)
                .outerjoin(MusicalCharacteristic, MusicalCharacteristic.song_id == Song.id)
                .options(
                    selectinload(Song.primary_artist),
                    selectinload(Song.album),
                    selectinload(Song.musical_characteristics),
                )
            )

            if filters.query:
                term = f"%{filters.query.lower()}%"
                stmt = stmt.where(func.lower(Song.title).like(term) | func.lower(Artist.name).like(term))

            if filters.artist:
                stmt = stmt.where(func.lower(Artist.name).like(f"%{filters.artist.lower()}%"))

            if filters.genre:
                stmt = stmt.where(func.lower(Song.genre).like(f"%{filters.genre.lower()}%"))

            if filters.key:
                stmt = stmt.where(MusicalCharacteristic.key == filters.key)

            if filters.min_bpm is not None:
                stmt = stmt.where(MusicalCharacteristic.bpm >= filters.min_bpm)

            if filters.max_bpm is not None:
                stmt = stmt.where(MusicalCharacteristic.bpm <= filters.max_bpm)

            # Pagination
            count_stmt = select(func.count()).select_from(stmt.subquery())
            total = (await session.execute(count_stmt)).scalar() or 0

            stmt = stmt.offset(filters.offset).limit(filters.limit)
            result = await session.execute(stmt)
            songs = result.scalars().all()

            items = []
            for s in songs:
                items.append({
                    "id": s.id,
                    "title": s.title,
                    "artist": s.primary_artist.name if s.primary_artist else "Unknown",
                    "album": s.album.title if s.album else "",
                    "genre": s.genre,
                    "release_date": s.release_date,
                    "duration": s.duration,
                    "key": s.musical_characteristics.key if s.musical_characteristics else None,
                    "bpm": s.musical_characteristics.bpm if s.musical_characteristics else None,
                    "isrc": s.isrc,
                })

            return {"total": total, "items": items, "limit": filters.limit, "offset": filters.offset}

    async def get_song_intelligence(self, song_id: int) -> Optional[SongIntelligenceResponse]:
        async with async_session_scope() as session:
            stmt = (
                select(Song)
                .where(Song.id == song_id)
                .options(
                    selectinload(Song.primary_artist),
                    selectinload(Song.album),
                    selectinload(Song.lyrics),
                    selectinload(Song.musical_characteristics),
                    selectinload(Song.songwriters),
                    selectinload(Song.composers),
                    selectinload(Song.producers),
                    selectinload(Song.recording_credits),
                    selectinload(Song.instruments),
                    selectinload(Song.sources),
                )
            )
            result = await session.execute(stmt)
            song = result.scalar_one_or_none()
            if not song:
                return None

            return self._build_intelligence_response(song)

    def _build_intelligence_response(self, song: Song) -> SongIntelligenceResponse:
        mc = song.musical_characteristics
        lyr = song.lyrics

        return SongIntelligenceResponse(
            song=SongMetadataSchema(
                title=song.title,
                artist=song.primary_artist.name if song.primary_artist else "Unknown",
                album=song.album.title if song.album else "",
                release_date=song.release_date or "",
                genre=song.genre or "",
                duration=song.duration or "",
                language=song.language or "en",
                record_label=song.record_label or "",
                isrc=song.isrc,
            ),
            songwriting=SongwritingSchema(
                writers=[w.name for w in song.songwriters],
                composers=[c.name for c in song.composers],
                lyricists=[w.name for w in song.songwriters],
                arrangers=[],
            ),
            composition=CompositionSchema(
                key=mc.key if mc else None,
                scale_type=mc.scale_type if mc else None,
                bpm=mc.bpm if mc else None,
                time_signature=mc.time_signature if mc else "4/4",
                chord_progression=mc.chord_progression if mc and mc.chord_progression else [],
                harmonic_analysis=mc.harmonic_structure if mc and mc.harmonic_structure else {},
                instruments=[inst.name for inst in song.instruments],
                structure=mc.structure_sections if mc and mc.structure_sections else [],
                melody_characteristics=mc.melody_characteristics if mc else None,
                vocal_characteristics=mc.vocal_characteristics if mc else None,
                rhythmic_patterns=mc.rhythmic_patterns if mc else None,
                dynamic_changes=mc.dynamic_changes if mc else None,
                is_estimated=mc.is_estimated if mc else False,
            ),
            production=ProductionSchema(
                producer=[p.name for p in song.producers],
                executive_producer=[],
                recording_engineer=[rc.person_or_studio for rc in song.recording_credits if rc.role == "recording_engineer"],
                mixing_engineer=[rc.person_or_studio for rc in song.recording_credits if rc.role == "mixing_engineer"],
                mastering_engineer=[rc.person_or_studio for rc in song.recording_credits if rc.role == "mastering_engineer"],
                recording_studio=[rc.person_or_studio for rc in song.recording_credits if rc.role == "recording_studio"],
                performers={},
            ),
            lyrics=LyricsSchema(
                availability=lyr.availability if lyr else "not_authorized",
                authorized_source=lyr.authorized_source if lyr else None,
                copyright_notice=lyr.copyright_notice if lyr else None,
                sections=lyr.sections if lyr and lyr.sections else [],
                rhyme_patterns=lyr.rhyme_patterns if lyr and lyr.rhyme_patterns else {},
                syllable_patterns=lyr.syllable_patterns if lyr and lyr.syllable_patterns else [],
                repeated_phrases=lyr.repeated_phrases if lyr and lyr.repeated_phrases else [],
                themes=lyr.lyrical_themes if lyr and lyr.lyrical_themes else [],
            ),
            sources=[],
            confidence=song.confidence or {},
            conflicts_detected=[],
            last_updated=song.last_updated.isoformat() if song.last_updated else "",
        )


music_service = MusicService()
