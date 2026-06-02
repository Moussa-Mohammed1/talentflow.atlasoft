from __future__ import annotations

from typing import Any

from app.services.identity_extraction.extractor import IdentityExtractor


class ResumeIdentityPipeline:
    def __init__(self) -> None:
        self.extractor = IdentityExtractor()

    def analyze(self, text: str) -> dict[str, Any]:
        return self.extractor.extract(text).to_dict()
