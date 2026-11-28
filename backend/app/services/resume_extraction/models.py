from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ParsedDocument(BaseModel):
    """Structured output returned by modular document parsers."""

    file_path: str
    file_type: str
    parser_used: str
    raw_text: str
    cleaned_text: str
    pages: list[str] = Field(default_factory=list)
    page_count: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)
