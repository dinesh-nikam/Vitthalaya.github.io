# Music Composition & Lyrics Intelligence Platform

An enterprise-grade music research, composition analysis, and data extraction platform built on **[Scrapling](https://github.com/D4Vinci/Scrapling)** as the primary web scraping and crawling framework.

---

## 1. System Overview & Core Capabilities

The platform collects, organizes, cross-references, and structures publicly accessible data regarding musical compositions, authorized lyrics, songwriting, production credits, and musical characteristics.

### Input Capabilities:
- **Song Title** & **Artist Name**
- **Album Name** & **Genre**
- **Authorized Song / Lyrics URL**
- **Multi-song / Multi-artist Batch Ingestion**
- **Artist Discography Crawling**

### Key Differentiators:
- **Ethical & Legal Scrapling Engine**: Strict `robots.txt` enforcement with TTL caching, per-domain token bucket rate limiting with randomized humanized jitter, and non-bypassable copyright verification for full lyrics (only permitted when public domain or legally authorized).
- **Adaptive Selectors**: Resilient parsing powered by Scrapling's `Selector` / `Adaptor` with auto-matching across frontend layout modifications.
- **Deep Musicological Intelligence**: Circle-of-fifths key estimation, Roman numeral harmonic analysis (`I - V - vi - IV`), tempo categorizations (Andante, Allegro, etc.), and poetics profiling (syllable counts, rhyme schemes like `AABB`, repeating motif density).
- **Multi-Source Cross-Referencing & Conflict Detection**: Evaluates field observations across authoritative archives (MusicBrainz, Discogs, AllMusic, Genius, Chordify, CPDL/IMSLP), flagging conflicts and computing confidence scores.

---

## 2. Platform Architecture

```mermaid
flowchart TD
    User([User / API Consumer / Frontend]) --> API[FastAPI REST API]
    API --> Pipeline[9-Step Music Intelligence Pipeline]
    
    subgraph Discovery & Compliance
        Pipeline --> SR[Source Resolver & Registry]
        SR --> RG[RobotsGuard: robots.txt TTL Cache]
        SR --> RL[RateLimiter: Token Bucket with Jitter]
    end

    subgraph Scrapling Engine
        RG --> FM[FetcherManager]
        RL --> FM
        FM --> SF[Scrapling Fetcher (curl_cffi TLS)]
        FM --> STF[Scrapling StealthyFetcher (Headless JS)]
        SF --> AP[AdaptiveScraplingParser (Selector / Adaptor)]
        STF --> AP
    end

    subgraph Extraction Layer
        AP --> CatA[Cat A: Basic Metadata]
        AP --> CatB[Cat B: Lyrics & Songwriting]
        AP --> CatC[Cat C: Musical Composition & Chords]
        AP --> CatD[Cat D: Production & Engineering]
        AP --> CatE[Cat E: Artist Intelligence]
    end

    subgraph Musicology & Intelligence
        CatB --> Poetics[Poetics: Syllables & Rhyme Schemes]
        CatC --> Harmonic[Harmonic Analyzer & Roman Numerals]
        CatA & CatB & CatC & CatD & CatE --> ConfEngine[Confidence Engine & Conflict Detection]
    end

    subgraph Persistence & Export
        ConfEngine --> DB[(PostgreSQL / SQLite: Relational Domain)]
        ConfEngine --> Export[Export Service: JSON / CSV / Excel]
    end

    DB --> UI[Interactive Web Dashboard]
    Export --> User
```

---

## 3. Data Collection Categories

| Category | Extracted Attributes | Ethical / Copyright Constraint |
| :--- | :--- | :--- |
| **A. Basic Song Metadata** | Title, Primary Artist, Featured Artists, Album, Release Date, Genre/Subgenre, Duration, Language, Record Label, ISRC. | Public factual metadata. Cleaned and normalized against catalog noise. |
| **B. Lyrics & Songwriting** | Songwriting credits, Lyricist, Verse divisions, Chorus, Pre-chorus, Bridge, Intro, Outro, Rhyme patterns, Syllable patterns, Lyrical themes. | **Authorized or Public Domain Only**. If unavailable/unauthorized, platform strictly extracts section labels, short factual descriptions, and authorized links. Never circumvents paywalls or DRM. |
| **C. Musical Composition** | Key, Tempo (BPM), Time Signature, Chord Progression, Roman Numeral Analysis, Instrumentation, Structure, Arrangement. | **Clearly distinguishes source-provided facts from algorithmically estimated attributes** (`is_estimated`, `estimation_algorithm`, `estimation_confidence`). |
| **D. Production & Recording** | Music Producer, Executive Producer, Recording/Mixing/Mastering Engineers, Studios, Musician instrumentation. | Preserves sound engineering credits and studio locations. |
| **E. Artist Intelligence** | Biography, Discography, Influences, Genres, Collaborations. | Cross-referenced across authoritative encyclopedias. |

---

## 4. Section 7 JSON Output Contract

The platform delivers data formatted strictly according to the standardized Section 7 specification:

```json
{
  "song": {
    "title": "Bohemian Rhapsody",
    "artist": "Queen",
    "featured_artists": [],
    "album": "A Night at the Opera",
    "release_date": "1975-10-31",
    "genre": "Progressive Rock",
    "subgenre": null,
    "duration": "5:55",
    "duration_seconds": 355,
    "language": "en",
    "record_label": "EMI Records",
    "isrc": "GBUM71029604"
  },
  "songwriting": {
    "writers": ["Freddie Mercury"],
    "composers": ["Freddie Mercury"],
    "lyricists": ["Freddie Mercury"],
    "arrangers": []
  },
  "composition": {
    "key": "Bb Major",
    "scale_type": "Major",
    "bpm": 72.0,
    "time_signature": "4/4",
    "chord_progression": ["Bb", "Gm", "Cm7", "F7"],
    "harmonic_analysis": {
      "key_analyzed": "Bb Major",
      "roman_numerals": ["I", "vi", "?(Cm7)", "?(F7)"],
      "cadence_pattern": "?(Cm7) - ?(F7)"
    },
    "instruments": ["Piano", "Vocals", "Bass", "Drums", "Electric Guitar"],
    "structure": ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"],
    "melody_characteristics": "Tempo marking: Adagio (Slow, Expressive)",
    "vocal_characteristics": "Operatic vocal layering",
    "rhythmic_patterns": "Meter 4/4",
    "dynamic_changes": "Moderate dynamic transitions between verse and chorus",
    "is_estimated": false,
    "estimation_algorithm": null,
    "estimation_confidence": null
  },
  "production": {
    "producer": ["Roy Thomas Baker", "Queen"],
    "executive_producer": [],
    "recording_engineer": [],
    "mixing_engineer": ["Mike Stone"],
    "mastering_engineer": [],
    "recording_studio": ["Rockfield Studios"],
    "performers": {}
  },
  "lyrics": {
    "availability": "authorized",
    "authorized_source": "Authorized License Archive",
    "copyright_notice": null,
    "sections": [
      {
        "type": "intro",
        "index": 1,
        "lines": [
          "Is this the real life? Is this just fantasy?",
          "Caught in a landslide, no escape from reality"
        ]
      }
    ],
    "rhyme_patterns": {
      "scheme": "AABB",
      "end_words": ["fantasy", "reality"],
      "rhyme_groups": {"ai": "A"}
    },
    "syllable_patterns": [11, 12],
    "repeated_phrases": [
      {"phrase": "nothing really matters", "count": 3}
    ],
    "themes": ["existentialism", "heartbreak"]
  },
  "sources": [
    {
      "source_name": "MusicBrainz Open Music Database",
      "source_url": "https://musicbrainz.org/recording/...",
      "source_type": "basic_metadata",
      "authority_score": 0.98,
      "retrieval_timestamp": "2026-11-04T12:00:00Z",
      "extraction_timestamp": "2026-11-04T12:00:01Z",
      "verification_status": "verified"
    }
  ],
  "confidence": {
    "title": 0.99,
    "artist": 0.99,
    "key": 0.95,
    "bpm": 0.92,
    "writers": 0.96
  },
  "conflicts_detected": [],
  "last_updated": "2026-11-04T12:00:01Z"
}
```

---

## 5. REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /api/health` | `GET` | Health status of Scrapling engine, database connectivity, and timestamp. |
| `POST /api/scrape/song` | `POST` | Executes complete 9-step extraction pipeline for a single song entity. |
| `POST /api/scrape/batch` | `POST` | Submits asynchronous batch crawling workload with concurrency limits. |
| `GET /api/scrape/batch/{job_id}`| `GET` | Polls batch execution progress, completed counts, and results. |
| `POST /api/scrape/discography` | `POST` | Crawls artist discography and catalog of album releases. |
| `GET /api/search/songs` | `GET` | Faceted search across indexed songs by title, artist, key, and BPM range. |
| `GET /api/compositions/{id}` | `GET` | Retrieves full composition, chords, credits, poetics, and confidence. |
| `GET /api/exports/download` | `GET` | Generates on-the-fly download in `json`, `csv`, or formatted `excel`. |
| `GET /api/sources` | `GET` | Inspects configured authoritative sources and permitted content constraints. |
| `GET /api/sources/history` | `GET` | Audit trail of scraped URLs, HTTP status codes, and execution times. |

### cURL Examples:

#### 1. Single Song Scrape:
```bash
curl -X POST "http://localhost:8000/api/scrape/song" \
     -H "Content-Type: application/json" \
     -d '{"title": "Bohemian Rhapsody", "artist": "Queen", "album": "A Night at the Opera"}'
```

#### 2. Export Filtered Catalog to Excel:
```bash
curl -O "http://localhost:8000/api/exports/download?format=excel&artist=Queen"
```

---

## 6. Setup & Local Development

### Prerequisites:
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (recommended) or standard `pip`

### Step 1: Create Virtual Environment & Install Dependencies
```bash
cd music_intelligence_platform
uv venv --python 3.11 .venv

# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies including Scrapling with fetchers
uv pip install -r requirements.txt
```

### Step 2: Initialize Database & Run Server
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```
Navigate to:
- **Interactive Web Dashboard**: `http://localhost:8000/` or `http://localhost:8000/dashboard`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`

---

## 7. Running the Test Suite

The platform includes a comprehensive automated test suite covering adaptive parsers, all 5 extractors, poetics, harmony analysis, deduplication, conflict resolution, pipeline execution, API endpoints, and exports:

```bash
pytest tests -v
```

**Test Verification Summary:**
```text
============================= test session starts =============================
tests/test_api.py::test_health_endpoint PASSED                           [  3%]
tests/test_api.py::test_sources_endpoint PASSED                          [  6%]
tests/test_api.py::test_search_endpoint_empty PASSED                     [ 10%]
tests/test_api.py::test_scrape_song_endpoint PASSED                      [ 13%]
tests/test_api.py::test_batch_scrape_endpoint PASSED                     [ 17%]
tests/test_exports.py::test_export_json PASSED                           [ 20%]
tests/test_exports.py::test_export_csv PASSED                            [ 24%]
tests/test_exports.py::test_export_excel PASSED                          [ 27%]
tests/test_extractors.py::test_metadata_extractor PASSED                 [ 31%]
tests/test_extractors.py::test_lyrics_extractor_authorized PASSED        [ 34%]
tests/test_extractors.py::test_lyrics_extractor_unauthorized PASSED      [ 37%]
tests/test_extractors.py::test_composition_extractor PASSED              [ 41%]
tests/test_extractors.py::test_production_extractor PASSED               [ 44%]
tests/test_musicology.py::test_musicology_chords_and_roman PASSED        [ 48%]
tests/test_musicology.py::test_musicology_key_estimation PASSED          [ 51%]
tests/test_musicology.py::test_musicology_tempo_classification PASSED    [ 55%]
tests/test_musicology.py::test_poetics_syllables PASSED                  [ 58%]
tests/test_musicology.py::test_poetics_rhyme_scheme PASSED               [ 62%]
tests/test_musicology.py::test_poetics_repeated_phrases PASSED           [ 65%]
tests/test_musicology.py::test_confidence_engine_consensus PASSED        [ 68%]
tests/test_musicology.py::test_confidence_engine_conflict PASSED         [ 72%]
tests/test_musicology.py::test_deduplication PASSED                      [ 75%]
tests/test_pipeline.py::test_pipeline_execution_and_persistence PASSED   [ 79%]
tests/test_scrapling_fetcher.py::test_adaptive_scrapling_parser_css PASSED [ 82%]
tests/test_scrapling_fetcher.py::test_adaptive_scrapling_parser_fallback PASSED [ 86%]
tests/test_scrapling_fetcher.py::test_adaptive_scrapling_parser_xpath PASSED [ 89%]
tests/test_scrapling_fetcher.py::test_adaptive_scrapling_parser_regex PASSED [ 93%]
tests/test_scrapling_fetcher.py::test_robots_guard PASSED                [ 96%]
tests/test_scrapling_fetcher.py::test_rate_limiter PASSED                [100%]

============================= 29 passed in 14.16s =============================
```

---

## 8. Docker Deployment

Deploy the entire production stack (FastAPI Backend, PostgreSQL 16, Redis 7) using Docker Compose:

```bash
docker compose up -d --build
```
Check container logs:
```bash
docker compose logs -f api
```
Access the application at `http://localhost:8000`.
