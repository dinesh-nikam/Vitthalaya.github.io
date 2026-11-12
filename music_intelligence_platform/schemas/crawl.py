"""Pydantic schemas for Crawler jobs and Source Registry queries."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SourceRegistryItem(BaseModel):
    id: str
    name: str
    base_url: str
    source_type: str
    authority_score: float
    rate_limit_per_second: float
    requires_js: bool
    robots_txt_url: str
    permitted_content: List[str]
    adaptive_selectors: Dict[str, str] = Field(default_factory=dict)


class CrawlJobRequest(BaseModel):
    source_id: str = Field(..., description="Target source ID from sources_registry.yaml")
    target_url: str = Field(..., description="Target URL to extract music or lyrics data from")
    dry_run: bool = Field(False, description="If true, extracts and validates without writing to DB")
    bypass_cache: bool = Field(False, description="If true, bypasses local robots/payload cache")


class CrawlJobResponse(BaseModel):
    job_id: str
    source_id: str
    target_url: str
    status: str  # "SUCCESS", "FAILED", "DISALLOWED", "SKIPPED"
    http_status: int
    duration_ms: float
    items_extracted: int
    data: Optional[Dict[str, Any]] = None
    audit_hash: str
    error_message: Optional[str] = None
    created_at: datetime
