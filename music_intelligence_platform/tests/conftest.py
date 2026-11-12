"""Test configuration, fixtures, and mock test datasets."""

import asyncio
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.main import create_app
from core.database import Base, get_async_db, init_db
from scrapling_engine.fetcher_manager import ScrapedResponse

# Test In-Memory Database Engine
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_database():
    """Initializes platform database tables for tests."""
    await init_db()
    yield


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Provides an isolated database session."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    """Provides an AsyncClient for FastAPI endpoint testing with DB dependency overridden."""
    app = create_app()

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_async_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_music_html():
    """Sample realistic music metadata HTML page for Scrapling parsing."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Bohemian Rhapsody - Queen | Music Catalog</title>
        <meta property="og:title" content="Bohemian Rhapsody" />
        <meta property="music:musician" content="Queen" />
        <meta property="music:album" content="A Night at the Opera" />
        <meta property="music:release_date" content="1975-10-31" />
        <meta property="music:genre" content="Progressive Rock" />
    </head>
    <body>
        <h1 class="song-title">Bohemian Rhapsody</h1>
        <h2 class="artist-name"><a href="/artist/queen">Queen</a></h2>
        <span class="album-title">A Night at the Opera</span>
        <span class="release-date">1975-10-31</span>
        <span class="duration">5:55</span>
        <span class="genre">Progressive Rock</span>
        <span class="isrc">GBUM71029604</span>
        <span class="label">EMI Records</span>
        <span class="language">en</span>

        <table class="details">
            <tr><td>written by</td><td><a href="#">Freddie Mercury</a></td></tr>
            <tr><td>composed by</td><td><a href="#">Freddie Mercury</a></td></tr>
            <tr><td>producer</td><td><a href="#">Roy Thomas Baker</a>, <a href="#">Queen</a></td></tr>
            <tr><td>recorded at</td><td><a href="#">Rockfield Studios</a></td></tr>
        </table>

        <div class="composition-info">
            <span data-key="Bb Major" class="song-key-badge">Bb Major</span>
            <span data-bpm="72" class="song-bpm-badge">72 BPM</span>
            <div class="chord-block">
                <span class="chord-label">Bb</span>
                <span class="chord-label">Gm</span>
                <span class="chord-label">Cm7</span>
                <span class="chord-label">F7</span>
            </div>
        </div>

        <div class="lyrics_box">
            [Intro]
            Is this the real life? Is this just fantasy?
            Caught in a landslide, no escape from reality
            Open your eyes, look up to the skies and see

            [Verse 1]
            Mama, just killed a man
            Put a gun against his head, pulled my trigger, now he's dead
            Mama, life had just begun
            But now I've gone and thrown it all away

            [Chorus]
            Mama, ooh, didn't mean to make you cry
            If I'm not back again this time tomorrow
            Carry on, carry on as if nothing really matters

            [Outro]
            Nothing really matters, anyone can see
            Nothing really matters, nothing really matters to me
        </div>
    </body>
    </html>
    """


@pytest.fixture
def mock_scraped_response(sample_music_html):
    """Instantiates a ScrapedResponse from sample HTML."""
    return ScrapedResponse(
        url="https://musicbrainz.org/recording/sample-123",
        status_code=200,
        content=sample_music_html,
        headers={"content-type": "text/html"},
        execution_time=0.15,
        fetcher_type="Fetcher",
    )
