from __future__ import annotations

import fitz
import pdfplumber

from app.services.resume_extraction.cleaner import TextCleaner
from app.services.resume_extraction.models import ParsedDocument
from app.services.resume_extraction.parsers.base import BaseDocumentParser, DocumentExtractionError


class PyMuPDFParser(BaseDocumentParser):
    """Fast primary PDF parser powered by PyMuPDF (fitz)."""

    supported_extensions = ("pdf",)

    def parse(self, file_path: str) -> ParsedDocument:
        doc = None
        pages: list[str] = []
        try:
            doc = fitz.open(file_path)
            for page in doc:
                pages.append(page.get_text("text") or "")
        except Exception as exc:
            raise DocumentExtractionError(f"PyMuPDF extraction failed: {exc}") from exc
        finally:
            if doc is not None:
                doc.close()

        raw_text = "\n".join(pages)
        cleaned_text = TextCleaner.clean(raw_text)
        return ParsedDocument(
            file_path=file_path,
            file_type="pdf",
            parser_used="pymupdf",
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            pages=pages,
            page_count=len(pages),
        )


class PdfPlumberParser(BaseDocumentParser):
    """Layout-aware fallback PDF parser powered by pdfplumber."""

    supported_extensions = ("pdf",)

    def parse(self, file_path: str) -> ParsedDocument:
        pages: list[str] = []
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    pages.append(page.extract_text() or "")
        except Exception as exc:
            raise DocumentExtractionError(f"pdfplumber extraction failed: {exc}") from exc

        raw_text = "\n".join(pages)
        cleaned_text = TextCleaner.clean(raw_text)
        return ParsedDocument(
            file_path=file_path,
            file_type="pdf",
            parser_used="pdfplumber",
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            pages=pages,
            page_count=len(pages),
        )


class PDFParser(BaseDocumentParser):
    """Composite PDF parser trying PyMuPDF first and falling back to pdfplumber."""

    supported_extensions = ("pdf",)
    MIN_TEXT_THRESHOLD = 50

    def __init__(
        self,
        primary: PyMuPDFParser | None = None,
        fallback: PdfPlumberParser | None = None,
    ) -> None:
        self.primary = primary or PyMuPDFParser()
        self.fallback = fallback or PdfPlumberParser()

    def parse(self, file_path: str) -> ParsedDocument:
        primary_error: Exception | None = None
        try:
            result = self.primary.parse(file_path)
            if len(result.cleaned_text.strip()) >= self.MIN_TEXT_THRESHOLD:
                return result
        except DocumentExtractionError as exc:
            primary_error = exc
            result = None

        try:
            fallback_result = self.fallback.parse(file_path)
            if fallback_result.cleaned_text.strip():
                return fallback_result
            if result is not None:
                return result
            return fallback_result
        except DocumentExtractionError:
            if result is not None:
                return result
            if primary_error is not None:
                raise primary_error
            raise
