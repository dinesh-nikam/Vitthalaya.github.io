"""Adaptive element resolution and parsing wrapping Scrapling Selector."""

import logging
import re
from typing import Any, List, Optional, Union
from scrapling.parser import Adaptor, Selector
from core.security import sanitize_text

logger = logging.getLogger("music_intelligence.parser")


class AdaptiveScraplingParser:
    """Wrapper around Scrapling Selector / Adaptor with adaptive matching and fallback chain support."""

    def __init__(self, content: Union[str, bytes], adaptive: bool = True, auto_save: bool = False):
        self.raw_content = content.decode("utf-8", errors="replace") if isinstance(content, bytes) else str(content)
        self.adaptive = adaptive
        self.auto_save = auto_save
        try:
            self.selector = Selector(self.raw_content, adaptive=self.adaptive)
        except Exception as exc:
            logger.warning(f"Error initializing Scrapling Selector with adaptive: {exc}. Falling back to default.")
            self.selector = Selector(self.raw_content)

    def extract_css(self, selector_string: str, fallback_selectors: Optional[List[str]] = None) -> Optional[str]:
        """Extracts single text value using primary CSS selector or fallback chain."""
        candidates = [selector_string] + (fallback_selectors or [])
        for sel in candidates:
            if not sel:
                continue
            try:
                elements = self.selector.css(sel, adaptive=self.adaptive, auto_save=self.auto_save)
                if elements:
                    first = elements[0]
                    val = getattr(first, "text", str(first))
                    if val and str(val).strip():
                        return sanitize_text(str(val))
            except Exception as exc:
                logger.debug(f"Selector '{sel}' did not match: {exc}")
                continue
        return None

    def extract_css_all(self, selector_string: str, fallback_selectors: Optional[List[str]] = None) -> List[str]:
        """Extracts list of text values using primary CSS selector or fallback chain."""
        candidates = [selector_string] + (fallback_selectors or [])
        for sel in candidates:
            if not sel:
                continue
            try:
                elements = self.selector.css(sel, adaptive=self.adaptive, auto_save=self.auto_save)
                if elements:
                    results = []
                    for el in elements:
                        val = getattr(el, "text", str(el))
                        cleaned = sanitize_text(str(val))
                        if cleaned and cleaned not in results:
                            results.append(cleaned)
                    if results:
                        return results
            except Exception as exc:
                logger.debug(f"Selector list '{sel}' did not match: {exc}")
                continue
        return []

    def extract_xpath(self, xpath_string: str, fallback_xpaths: Optional[List[str]] = None) -> Optional[str]:
        """Extracts single text value using primary XPath or fallback chain."""
        candidates = [xpath_string] + (fallback_xpaths or [])
        for xp in candidates:
            if not xp:
                continue
            try:
                elements = self.selector.xpath(xp, adaptive=self.adaptive, auto_save=self.auto_save)
                if elements:
                    first = elements[0]
                    val = getattr(first, "text", str(first))
                    if val and str(val).strip():
                        return sanitize_text(str(val))
            except Exception as exc:
                logger.debug(f"XPath '{xp}' did not match: {exc}")
                continue
        return None

    def extract_regex(self, pattern: str) -> Optional[str]:
        """Extracts first regex match from the document text."""
        try:
            match = re.search(pattern, self.raw_content, re.IGNORECASE)
            if match:
                return sanitize_text(match.group(1) if match.groups() else match.group(0))
        except Exception as exc:
            logger.debug(f"Regex extraction failed: {exc}")
        return None
