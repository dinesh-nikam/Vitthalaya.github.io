"""Domain exceptions for Music Intelligence Platform."""


class MusicPlatformException(Exception):
    """Base exception for all music platform errors."""
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ExtractionError(MusicPlatformException):
    """Raised when an extractor fails to parse content or encounter schema deviations."""
    pass


class RobotsDisallowedError(MusicPlatformException):
    """Raised when crawling is prohibited by domain robots.txt."""
    pass


class RateLimitExceededError(MusicPlatformException):
    """Raised when target domain request quota or speed limit is exceeded."""
    pass


class SourceNotPermittedError(MusicPlatformException):
    """Raised when attempting to scrape content outside copyright/licensing permission."""
    pass


class SourceNotFoundError(MusicPlatformException):
    """Raised when source cannot be discovered or returns 404/empty."""
    pass


class EntityResolutionError(MusicPlatformException):
    """Raised when entity identification or cross-referencing encounters ambiguity."""
    pass
