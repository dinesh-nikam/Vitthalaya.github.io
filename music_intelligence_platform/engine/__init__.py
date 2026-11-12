"""Engine package initialization."""

from engine.robots import robots_manager, RobotsManager
from engine.rate_limiter import domain_rate_limiter, DomainRateLimiter
from engine.scrapling_fetcher import scrapling_fetcher, ScraplingFetcher, FetchResult
from engine.crawler_service import crawler_service, CrawlerService

__all__ = [
    "robots_manager",
    "RobotsManager",
    "domain_rate_limiter",
    "DomainRateLimiter",
    "scrapling_fetcher",
    "ScraplingFetcher",
    "FetchResult",
    "crawler_service",
    "CrawlerService",
]
