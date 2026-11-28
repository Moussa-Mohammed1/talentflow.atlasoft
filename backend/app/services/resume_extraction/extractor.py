from __future__ import annotations

import os
from pathlib import Path

from app.services.resume_extraction.cleaner import TextCleaner
from app.services.resume_extraction.models import ParsedDocument
from app.services.resume_extraction.parsers import (
    BaseDocumentParser,
    DocxParser,
    PDFParser,
    UnsupportedFileTypeError,
)


class TextExtractionService:
    """Facade selecting the right clean parser for PDF and DOCX CV files."""

    def __init__(self, parsers: list[BaseDocumentParser] | None = None) -> None:
        self._parsers: list[BaseDocumentParser] = parsers or [
            PDFParser(),
            DocxParser(),
        ]

    def extract_document(self, file_path: str) -> ParsedDocument:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        extension = self._get_extension(file_path)
        for parser in self._parsers:
            if parser.supports(extension):
                return parser.parse(file_path)

        raise UnsupportedFileTypeError(f"File type unsupported: {extension}")

    def extract(self, file_path: str) -> str:
        return self.extract_document(file_path).cleaned_text

    @staticmethod
    def _get_extension(file_path: str) -> str:
        suffix = Path(file_path).suffix.lstrip(".").lower()
        if suffix:
            return suffix
        return file_path.split(".")[-1].lower()

    @staticmethod
    def _clean_text(text: str) -> str:
        return TextCleaner.clean(text)
