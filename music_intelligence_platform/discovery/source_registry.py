"""Source registry manager loading authoritative sources, authority weights, and permitted content rules."""

from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml
from config.settings import settings
from core.exceptions import SourceNotPermittedError


class SourceDefinition:
    def __init__(self, data: Dict[str, Any]):
        self.id = data["id"]
        self.name = data["name"]
        self.base_url = data["base_url"]
        self.source_type = data.get("source_type", "open_database")
        self.authority_score = float(data.get("authority_score", 0.8))
        self.rate_limit_per_second = float(data.get("rate_limit_per_second", 1.0))
        self.requires_js = bool(data.get("requires_js", False))
        self.robots_txt_url = data.get("robots_txt_url")
        self.permitted_content = set(data.get("permitted_content", []))
        self.adaptive_selectors = data.get("adaptive_selectors", {})

    def permits(self, content_category: str) -> bool:
        return content_category in self.permitted_content

    def assert_permitted(self, content_category: str) -> None:
        if not self.permits(content_category):
            raise SourceNotPermittedError(
                f"Source '{self.name}' does not permit extraction of category '{content_category}'.",
                details={"source_id": self.id, "requested": content_category}
            )


class SourceRegistry:
    """Manages source configurations and authority scores."""

    def __init__(self, config_path: str = settings.sources_registry_path):
        self.config_path = Path(config_path)
        self.sources: Dict[str, SourceDefinition] = {}
        self.load()

    def load(self) -> None:
        if not self.config_path.exists():
            return
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            for src_data in data.get("sources", []):
                src = SourceDefinition(src_data)
                self.sources[src.id] = src

    def get(self, source_id: str) -> Optional[SourceDefinition]:
        return self.sources.get(source_id)

    def list_sources(self) -> List[SourceDefinition]:
        return sorted(list(self.sources.values()), key=lambda s: s.authority_score, reverse=True)

    def get_sources_for_category(self, category: str) -> List[SourceDefinition]:
        """Returns sources permitted to extract a given data category in order of authority."""
        return [s for s in self.list_sources() if s.permits(category)]


# Global source registry singleton
source_registry = SourceRegistry()
