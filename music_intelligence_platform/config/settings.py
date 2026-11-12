"""Configuration settings for Music Composition & Lyrics Intelligence Platform."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # App
    app_name: str = "Music Intelligence Platform"
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True
    log_level: str = "INFO"

    # Database
    database_url: str = f"sqlite+aiosqlite:///{BASE_DIR / 'music_intelligence.db'}"
    sync_database_url: str = f"sqlite:///{BASE_DIR / 'music_intelligence.db'}"

    # Redis / Workers
    redis_url: str = "redis://localhost:6379/0"
    enable_redis_queue: bool = False

    # Scrapling Engine
    scrapling_timeout: int = 30
    scrapling_max_retries: int = 3
    scrapling_default_wait: float = 2.0
    scrapling_headless: bool = True
    scrapling_storage_dir: str = str(BASE_DIR / "storage" / "scrapling_adaptive")

    # Robots & Compliance
    robots_txt_cache_ttl: int = 86400
    default_domain_delay: float = 2.0
    user_agent: str = (
        "MusicIntelligenceBot/1.0 "
        "(+https://music-intelligence.local; respectful musicological academic research)"
    )

    # Sources Registry
    sources_registry_path: str = str(BASE_DIR / "config" / "sources_registry.yaml")

    @property
    def effective_database_url(self) -> str:
        if "postgresql" in self.database_url and "aiosqlite" not in self.database_url:
            return f"sqlite+aiosqlite:///{BASE_DIR / 'music_intelligence.db'}"
        return self.database_url

    @property
    def effective_sync_database_url(self) -> str:
        if "postgresql" in self.sync_database_url and "sqlite" not in self.sync_database_url:
            return f"sqlite:///{BASE_DIR / 'music_intelligence.db'}"
        return self.sync_database_url

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
