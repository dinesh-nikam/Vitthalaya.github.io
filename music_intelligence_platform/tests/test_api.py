"""FastAPI endpoints integration tests."""

from unittest.mock import AsyncMock, patch
import pytest
from models.schemas import SingleSongScrapeRequest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("healthy", "degraded")
    assert "version" in data


@pytest.mark.asyncio
async def test_sources_endpoint(client):
    res = await client.get("/api/sources")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    assert any(s["id"] == "musicbrainz" for s in data["sources"])


@pytest.mark.asyncio
async def test_search_endpoint_empty(client):
    res = await client.get("/api/search/songs?query=nonexistent")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_scrape_song_endpoint(client, mock_scraped_response):
    # Mock network fetching to return mock_scraped_response
    with patch("scrapling_engine.fetcher_manager.fetcher_manager.fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_scraped_response
        payload = {
            "title": "Bohemian Rhapsody",
            "artist": "Queen",
            "album": "A Night at the Opera",
            "genre": "Rock",
        }
        res = await client.post("/api/scrape/song", json=payload)
        assert res.status_code == 200
        data = res.json()

        # Check structure conforms to Section 7 contract
        assert "song" in data
        assert "songwriting" in data
        assert "composition" in data
        assert "production" in data
        assert "lyrics" in data
        assert "confidence" in data
        assert data["song"]["title"] == "Bohemian Rhapsody"
        assert data["song"]["artist"] == "Queen"
        assert "writers" in data["songwriting"]
        assert "Freddie Mercury" in data["songwriting"]["writers"]


@pytest.mark.asyncio
async def test_batch_scrape_endpoint(client):
    payload = {
        "songs": [
            {"title": "Song One", "artist": "Artist One"},
            {"title": "Song Two", "artist": "Artist Two"},
        ],
        "concurrency": 2,
    }
    res = await client.post("/api/scrape/batch", json=payload)
    assert res.status_code == 202
    data = res.json()
    assert "job_id" in data
    assert data["status"] == "queued"
    assert data["total_songs"] == 2
