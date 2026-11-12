"""Relational database models for Music Composition & Lyrics Intelligence Platform."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from core.database import Base

JSONType = JSON().with_variant(SQLITE_JSON, "sqlite")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Association Tables for Many-to-Many Relationships
song_songwriters = Table(
    "song_songwriters",
    Base.metadata,
    Column("song_id", Integer, ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True),
    Column("songwriter_id", Integer, ForeignKey("songwriters.id", ondelete="CASCADE"), primary_key=True),
    Column("contribution_type", String(100), default="writer"),
    extend_existing=True,
)

song_composers = Table(
    "song_composers",
    Base.metadata,
    Column("song_id", Integer, ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True),
    Column("composer_id", Integer, ForeignKey("composers.id", ondelete="CASCADE"), primary_key=True),
    Column("arrangement_credit", String(100), nullable=True),
    extend_existing=True,
)

song_producers = Table(
    "song_producers",
    Base.metadata,
    Column("song_id", Integer, ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True),
    Column("producer_id", Integer, ForeignKey("producers.id", ondelete="CASCADE"), primary_key=True),
    Column("role", String(100), default="producer"),
    extend_existing=True,
)

song_genres = Table(
    "song_genres",
    Base.metadata,
    Column("song_id", Integer, ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
    extend_existing=True,
)

song_instruments = Table(
    "song_instruments",
    Base.metadata,
    Column("song_id", Integer, ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True),
    Column("instrument_id", Integer, ForeignKey("instruments.id", ondelete="CASCADE"), primary_key=True),
    Column("performer", String(255), nullable=True),
    extend_existing=True,
)

song_sources = Table(
    "song_sources",
    Base.metadata,
    Column("song_id", Integer, ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True),
    Column("source_id", Integer, ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True),
    Column("retrieval_timestamp", DateTime(timezone=True), default=utc_now),
    Column("source_url", Text, nullable=False),
    Column("confidence_score", Float, default=1.0),
    Column("verification_status", String(50), default="verified"),
    extend_existing=True,
)


class Artist(Base):
    __tablename__ = "artists"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    normalized_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    biography: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    active_years: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    musical_influences: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    collaborations: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    songs: Mapped[List["Song"]] = relationship("Song", back_populates="primary_artist", cascade="all, delete-orphan")
    albums: Mapped[List["Album"]] = relationship("Album", back_populates="artist", cascade="all, delete-orphan")


class Album(Base):
    __tablename__ = "albums"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    normalized_title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    artist_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("artists.id", ondelete="SET NULL"), nullable=True)
    release_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    album_type: Mapped[Optional[str]] = mapped_column(String(50), default="LP")
    track_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    artist: Mapped[Optional["Artist"]] = relationship("Artist", back_populates="albums")
    songs: Mapped[List["Song"]] = relationship("Song", back_populates="album")


class Song(Base):
    __tablename__ = "songs"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    normalized_title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    primary_artist_id: Mapped[int] = mapped_column(Integer, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False, index=True)
    album_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("albums.id", ondelete="SET NULL"), nullable=True)
    
    release_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subgenre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    duration: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="en")
    record_label: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    isrc: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    featured_artists: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)

    # Confidence summary dict
    confidence: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=dict)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    # Relationships
    primary_artist: Mapped["Artist"] = relationship("Artist", back_populates="songs")
    album: Mapped[Optional["Album"]] = relationship("Album", back_populates="songs")
    lyrics: Mapped[Optional["Lyric"]] = relationship("Lyric", uselist=False, back_populates="song", cascade="all, delete-orphan")
    musical_characteristics: Mapped[Optional["MusicalCharacteristic"]] = relationship("MusicalCharacteristic", uselist=False, back_populates="song", cascade="all, delete-orphan")
    
    songwriters: Mapped[List["Songwriter"]] = relationship("Songwriter", secondary=song_songwriters, back_populates="songs")
    composers: Mapped[List["Composer"]] = relationship("Composer", secondary=song_composers, back_populates="songs")
    producers: Mapped[List["Producer"]] = relationship("Producer", secondary=song_producers, back_populates="songs")
    recording_credits: Mapped[List["RecordingCredit"]] = relationship("RecordingCredit", back_populates="song", cascade="all, delete-orphan")
    instruments: Mapped[List["Instrument"]] = relationship("Instrument", secondary=song_instruments, back_populates="songs")
    genres: Mapped[List["Genre"]] = relationship("Genre", secondary=song_genres, back_populates="songs")
    sources: Mapped[List["Source"]] = relationship("Source", secondary=song_sources, back_populates="songs")


class Songwriter(Base):
    __tablename__ = "songwriters"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    songs: Mapped[List["Song"]] = relationship("Song", secondary=song_songwriters, back_populates="songwriters")


class Composer(Base):
    __tablename__ = "composers"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    songs: Mapped[List["Song"]] = relationship("Song", secondary=song_composers, back_populates="composers")


class Producer(Base):
    __tablename__ = "producers"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    songs: Mapped[List["Song"]] = relationship("Song", secondary=song_producers, back_populates="producers")


class RecordingCredit(Base):
    __tablename__ = "recording_credits"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    song_id: Mapped[int] = mapped_column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(100), nullable=False)  # mixing_engineer, mastering_engineer, recording_studio
    person_or_studio: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    song: Mapped["Song"] = relationship("Song", back_populates="recording_credits")


class Instrument(Base):
    __tablename__ = "instruments"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    family: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # strings, brass, keys, percussion

    songs: Mapped[List["Song"]] = relationship("Song", secondary=song_instruments, back_populates="instruments")


class Genre(Base):
    __tablename__ = "genres"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)

    songs: Mapped[List["Song"]] = relationship("Song", secondary=song_genres, back_populates="genres")


class MusicalCharacteristic(Base):
    __tablename__ = "musical_characteristics"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    song_id: Mapped[int] = mapped_column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Musical composition attributes
    key: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    scale_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # major, minor, modal, dorian
    bpm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    time_signature: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Authorized chord progression & harmony
    chord_progression: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    harmonic_structure: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=dict)
    
    # Melody, arrangement, dynamic characteristics
    melody_characteristics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instrumentation_summary: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    structure_sections: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    vocal_characteristics: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rhythmic_patterns: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dynamic_changes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Clearly distinguish source-provided facts vs algorithmically estimated
    is_estimated: Mapped[bool] = mapped_column(Boolean, default=False)
    estimation_algorithm: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    estimation_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    song: Mapped["Song"] = relationship("Song", back_populates="musical_characteristics")


class Lyric(Base):
    __tablename__ = "lyrics"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    song_id: Mapped[int] = mapped_column(Integer, ForeignKey("songs.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Authorized copyright compliance status
    # 'authorized', 'public_domain', 'licensed_metadata_only', 'not_authorized'
    availability: Mapped[str] = mapped_column(String(50), default="not_authorized")
    authorized_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    copyright_notice: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    full_lyrics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Structured sections: [{'type': 'verse', 'index': 1, 'lines': [...]}, {'type': 'chorus', ...}]
    sections: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    
    # Poetic & syllable metrics
    rhyme_patterns: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=dict)
    syllable_patterns: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    repeated_phrases: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)
    lyrical_themes: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True, default=list)

    song: Mapped["Song"] = relationship("Song", back_populates="lyrics")


class Source(Base):
    __tablename__ = "sources"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    identifier: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_url: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(100), nullable=False)
    authority_score: Mapped[float] = mapped_column(Float, default=0.85)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    songs: Mapped[List["Song"]] = relationship("Song", secondary=song_sources, back_populates="sources")
    scraping_histories: Mapped[List["ScrapingHistory"]] = relationship("ScrapingHistory", back_populates="source")


class ScrapingHistory(Base):
    __tablename__ = "scraping_history"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("sources.id", ondelete="SET NULL"), nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # success, failed, skipped_robots, rate_limited
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    fetcher_used: Mapped[str] = mapped_column(String(50), default="Fetcher")  # Fetcher, StealthyFetcher
    items_extracted: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_time_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    source: Mapped[Optional["Source"]] = relationship("Source", back_populates="scraping_histories")
