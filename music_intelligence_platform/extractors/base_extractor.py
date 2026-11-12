"""Abstract Base Extractor preserving source attribution, timestamps, and confidence scores."""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from scrapling_engine.fetcher_manager import ScrapedResponse
from discovery.source_registry import SourceDefinition


class ExtractionResult:
    """Standardized extractor output packaging data with audit metadata."""

    def __init__(
        self,
        category: str,
        data: Dict[str, Any],
        source_name: str,
        source_url: str,
        retrieval_timestamp: datetime,
        authority_score: float = 0.85,
        confidence_score: float = 0.90,
        verification_status: str = "verified",
    ):
        self.category = category
        self.data = data
        self.source_name = source_name
        self.source_url = source_url
        self.retrieval_timestamp = retrieval_timestamp
        self.extraction_timestamp = datetime.now(timezone.utc)
        self.authority_score = authority_score
        self.confidence_score = confidence_score
        self.verification_status = verification_status

    def to_attribution(self) -> Dict[str, Any]:
        return {
            "source_name": self.source_name,
            "source_url": self.source_url,
            "source_type": self.category,
            "authority_score": self.authority_score,
            "retrieval_timestamp": self.retrieval_timestamp.isoformat(),
            "extraction_timestamp": self.extraction_timestamp.isoformat(),
            "verification_status": self.verification_status,
        }


class BaseExtractor(ABC):
    """Abstract base class for all category extractors."""

    category: str = "base"

    @abstractmethod
    def extract(self, response: ScrapedResponse, source_def: Optional[SourceDefinition] = None) -> ExtractionResult:
        """Extracts structured category information from ScrapedResponse."""
        pass
