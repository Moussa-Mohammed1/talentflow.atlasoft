from __future__ import annotations

from abc import ABC, abstractmethod

from app.services.resume_extraction.models import ParsedDocument


class UnsupportedFileTypeError(ValueError):
    """Raised when a CV file extension is not supported by any parser."""


class DocumentExtractionError(RuntimeError):
    """Raised when a document parser fails to read or decode a CV file."""


class BaseDocumentParser(ABC):
    """Contract for format-specific CV document parsers."""

    supported_extensions: tuple[str, ...] = ()

    @classmethod
    def supports(cls, extension: str) -> bool:
        return extension.lstrip(".").casefold() in cls.supported_extensions

    @abstractmethod
    def parse(self, file_path: str) -> ParsedDocument:
        """Extract raw and cleaned text plus page metadata from ``file_path``."""
