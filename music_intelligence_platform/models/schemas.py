"""Pydantic schemas for Music Composition & Lyrics Intelligence Platform.
Matches the official Section 7 JSON output contract and request structures.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl


class SongMetadataSchema(BaseModel):
    title: str = Field(default="", description="Canonical song title")
    artist: str = Field(default="", description="Primary performing artist or ensemble")
    featured_artists: List[str] = Field(default_factory=list, description="Featured or guest artists")
    album: Optional[str] = Field(default="", description="Associated album or release title")
    release_date: Optional[str] = Field(default="", description="Release date in ISO or YYYY format")
    genre: Optional[str] = Field(default="", description="Primary musical genre")
    subgenre: Optional[str] = Field(default="", description="Subgenre or musical style")
    duration: Optional[str] = Field(default="", description="Formatted duration e.g. 3:45")
    duration_seconds: Optional[int] = Field(default=None, description="Duration in seconds")
    language: Optional[str] = Field(default="en", description="Primary song lyric language code")
    record_label: Optional[str] = Field(default="", description="Publishing or releasing record label")
    isrc: Optional[str] = Field(default=None, description="International Standard Recording Code")


class SongwritingSchema(BaseModel):
    writers: List[str] = Field(default_factory=list, description="Songwriters credited")
    composers: List[str] = Field(default_factory=list, description="Melodic and harmonic composers")
    lyricists: List[str] = Field(default_factory=list, description="Text and poetry writers")
    arrangers: List[str] = Field(default_factory=list, description="Musical arrangers")


class CompositionSchema(BaseModel):
    key: Optional[str] = Field(default=None, description="Musical key signature e.g. C Major, F# Minor")
    scale_type: Optional[str] = Field(default=None, description="Diatonic scale mode e.g. major, minor, dorian")
    bpm: Optional[float] = Field(default=None, description="Beats per minute tempo")
    time_signature: Optional[str] = Field(default=None, description="Meter signature e.g. 4/4, 6/8, 3/4")
    chord_progression: List[str] = Field(default_factory=list, description="Standard harmonic chord progression")
    harmonic_analysis: Dict[str, Any] = Field(default_factory=dict, description="Roman numeral or harmonic function analysis")
    instruments: List[str] = Field(default_factory=list, description="Identified musical instrumentation")
    structure: List[str] = Field(default_factory=list, description="Formal musical structure e.g. Intro, Verse 1, Chorus, Outro")
    melody_characteristics: Optional[str] = Field(default=None, description="Melodic contour or contour descriptor")
    vocal_characteristics: Optional[str] = Field(default=None, description="Vocal delivery and timbre characteristics")
    rhythmic_patterns: Optional[str] = Field(default=None, description="Groove, syncopation, or rhythmic cadence")
    dynamic_changes: Optional[str] = Field(default=None, description="Dynamic contrast e.g. pianissimo to fortissimo")
    is_estimated: bool = Field(default=False, description="Flag indicating if musical characteristics were algorithmically derived")
    estimation_algorithm: Optional[str] = Field(default=None, description="Algorithm name if estimated")


class ProductionSchema(BaseModel):
    producer: List[str] = Field(default_factory=list, description="Primary record producers")
    executive_producer: List[str] = Field(default_factory=list, description="Executive production credits")
    recording_engineer: List[str] = Field(default_factory=list, description="Tracking and recording engineers")
    mixing_engineer: List[str] = Field(default_factory=list, description="Mixing engineers")
    mastering_engineer: List[str] = Field(default_factory=list, description="Mastering engineers")
    recording_studio: List[str] = Field(default_factory=list, description="Recording and acoustic studios")
    performers: Dict[str, str] = Field(default_factory=dict, description="Musician to instrument mapping")


class LyricSectionSchema(BaseModel):
    type: str = Field(description="Section type e.g. intro, verse, pre-chorus, chorus, bridge, outro")
    index: int = Field(default=1, description="Sequential section index")
    lines: List[str] = Field(default_factory=list, description="Poetic lines of this section")


class LyricsSchema(BaseModel):
    availability: Literal["authorized", "public_domain", "licensed_metadata_only", "not_authorized"] = Field(
        default="not_authorized",
        description="Copyright compliance and authorization state"
    )
    authorized_source: Optional[str] = Field(default=None, description="Permitted licensing source or archive name")
    copyright_notice: Optional[str] = Field(default=None, description="Copyright ownership notice")
    sections: List[LyricSectionSchema] = Field(default_factory=list, description="Structured lyric sections")
    rhyme_patterns: Dict[str, Any] = Field(default_factory=dict, description="Detected rhyme scheme e.g. AABB, ABAB")
    syllable_patterns: List[int] = Field(default_factory=list, description="Syllable count distribution per line")
    repeated_phrases: List[Dict[str, Any]] = Field(default_factory=list, description="Frequently repeated motif phrases")
    themes: List[str] = Field(default_factory=list, description="Lyrical and thematic concepts")


class SourceAttributionSchema(BaseModel):
    source_name: str
    source_url: str
    source_type: str
    authority_score: float
    retrieval_timestamp: str
    extraction_timestamp: str
    verification_status: str = "verified"


class SongIntelligenceResponse(BaseModel):
    """Primary JSON schema as specified in Section 7 of project specification."""
    song: SongMetadataSchema
    songwriting: SongwritingSchema
    composition: CompositionSchema
    production: ProductionSchema
    lyrics: LyricsSchema
    sources: List[SourceAttributionSchema] = Field(default_factory=list)
    confidence: Dict[str, float] = Field(default_factory=dict)
    conflicts_detected: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# Request Models
class SingleSongScrapeRequest(BaseModel):
    title: str = Field(..., description="Song title")
    artist: Optional[str] = Field(None, description="Primary artist name")
    album: Optional[str] = Field(None, description="Album name")
    genre: Optional[str] = Field(None, description="Music genre")
    url: Optional[str] = Field(None, description="Direct URL to authorized song source")
    force_refresh: bool = Field(default=False, description="Bypass cache and re-crawl")


class BatchSongScrapeRequest(BaseModel):
    songs: List[SingleSongScrapeRequest] = Field(..., min_length=1, description="List of songs to research")
    concurrency: int = Field(default=3, ge=1, le=10, description="Concurrent crawler workers")


class DiscographyCrawlRequest(BaseModel):
    artist_name: str = Field(..., description="Artist name whose discography should be crawled")
    max_albums: int = Field(default=10, ge=1, le=50)
    include_compositions: bool = Field(default=True)


class SongSearchFilter(BaseModel):
    query: Optional[str] = None
    artist: Optional[str] = None
    genre: Optional[str] = None
    key: Optional[str] = None
    min_bpm: Optional[float] = None
    max_bpm: Optional[float] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class ExportFormat(str):
    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"
