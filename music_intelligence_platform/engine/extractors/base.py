"""Base interface and utility functions for metadata and lyrics extractors."""

import re
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from core.security import sanitize_text, clean_lyrics_text
from engine.scrapling_fetcher import FetchResult


class BaseExtractor(ABC):
    """Abstract base class for source-specific musicological extractors."""

    source_id: str = "generic"

    @abstractmethod
    def extract(self, fetch_result: FetchResult, selectors: Dict[str, str]) -> Dict[str, Any]:
        """Parses page text or adaptor into structured metadata dictionary."""
        pass

    def query_selector(self, fetch_result: FetchResult, selector: str) -> List[str]:
        """Queries elements using Scrapling Adaptor or fallback regex."""
        if not selector:
            return []

        results: List[str] = []
        if fetch_result.adaptor is not None:
            try:
                # Handle Scrapling selector syntax (e.g. "h1::text" or standard CSS)
                css_selector = selector.split("::")[0].strip()
                elements = fetch_result.adaptor.css(css_selector)
                for el in elements:
                    txt = getattr(el, "text", "") or str(el)
                    cleaned = sanitize_text(txt)
                    if cleaned:
                        results.append(cleaned)
                if results:
                    return results
            except Exception:
                pass

        # Fallback to regex extraction on raw HTML
        clean_sel = selector.split("::")[0].strip()
        tag_match = re.search(r"([a-z0-9]+)", clean_sel, re.IGNORECASE)
        if tag_match:
            tag = tag_match.group(1)
            pattern = re.compile(rf"<{tag}[^>]*>(.*?)</{tag}>", re.DOTALL | re.IGNORECASE)
            for m in pattern.finditer(fetch_result.text):
                cleaned = sanitize_text(m.group(1))
                if cleaned:
                    results.append(cleaned)

        return results

    def query_first(self, fetch_result: FetchResult, selector: str) -> Optional[str]:
        matches = self.query_selector(fetch_result, selector)
        return matches[0] if matches else None
