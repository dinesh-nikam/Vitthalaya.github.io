"""Pipeline integration tests with end-to-end execution and database verification."""

from unittest.mock import AsyncMock, patch
import pytest
from models.schemas import SingleSongScrapeRequest
from pipeline.orchestrator import music_pipeline
from services.music_service import music_service


@pytest.mark.asyncio
async def test_pipeline_execution_and_persistence(mock_scraped_response, db_session):
    with patch("scrapling_engine.fetcher_manager.fetcher_manager.fetch", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_scraped_response
        req = SingleSongScrapeRequest(
            title="Bohemian Rhapsody",
            artist="Queen",
            album="A Night at the Opera",
        )

        response = await music_pipeline.execute(req)

        assert response.song.title == "Bohemian Rhapsody"
        assert response.song.artist == "Queen"
        assert response.composition.key == "Bb Major"
        assert response.composition.bpm == 72.0
        assert "Freddie Mercury" in response.songwriting.writers
        assert response.confidence["title"] >= 0.90
        assert response.confidence["artist"] >= 0.90
