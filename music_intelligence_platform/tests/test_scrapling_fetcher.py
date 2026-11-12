"""Tests for Scrapling adaptive parsing, robots.txt compliance, and rate limiting."""

import pytest
from scrapling_engine.adaptive_parser import AdaptiveScraplingParser
from scrapling_engine.rate_limiter import DomainBucket, RateLimiter
from scrapling_engine.robots_guard import RobotsGuard


def test_adaptive_scrapling_parser_css(sample_music_html):
    parser = AdaptiveScraplingParser(sample_music_html)

    title = parser.extract_css("h1.song-title::text")
    assert title == "Bohemian Rhapsody"

    artist = parser.extract_css("h2.artist-name a::text")
    assert artist == "Queen"

    isrc = parser.extract_css("span.isrc::text")
    assert isrc == "GBUM71029604"


def test_adaptive_scrapling_parser_fallback(sample_music_html):
    parser = AdaptiveScraplingParser(sample_music_html)

    # Primary selector does not exist, should fall back to secondary
    title = parser.extract_css("div.nonexistent-title::text", ["meta[property='og:title']::attr(content)"])
    assert title == "Bohemian Rhapsody"


def test_adaptive_scrapling_parser_xpath(sample_music_html):
    parser = AdaptiveScraplingParser(sample_music_html)

    title = parser.extract_xpath("//h1[contains(@class, 'song-title')]/text()")
    assert title == "Bohemian Rhapsody"


def test_adaptive_scrapling_parser_regex(sample_music_html):
    parser = AdaptiveScraplingParser(sample_music_html)

    bpm_val = parser.extract_regex(r'data-bpm="(\d+)"')
    assert bpm_val == "72"


@pytest.mark.asyncio
async def test_robots_guard():
    guard = RobotsGuard()
    # Test internal method for robots parsing
    parser = await guard._fetch_and_parse("https://example.com", "https://example.com/robots.txt")
    assert parser is not None


@pytest.mark.asyncio
async def test_rate_limiter():
    bucket = DomainBucket(requests_per_second=10.0, burst=2)
    # Should acquire without error
    await bucket.acquire()
    assert bucket.tokens <= 1.0
