"""Structured logging configuration for the Music Intelligence Platform."""

import logging
import sys
from typing import Any, Dict


class StructuredFormatter(logging.Formatter):
    """Formats log records as structured text with module, level, and timestamp."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, "%Y-%m-%d %H:%M:%S")
        log_obj: Dict[str, Any] = {
            "timestamp": timestamp,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return f"[{log_obj['timestamp']}] [{log_obj['level']:<7}] [{log_obj['logger']}] {log_obj['message']}"


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configures root and platform loggers."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())

    # Avoid duplicate handlers
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        root_logger.addHandler(handler)

    logger = logging.getLogger("music_intelligence")
    logger.setLevel(level.upper())
    return logger


logger = setup_logging()
