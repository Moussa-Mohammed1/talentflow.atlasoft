from __future__ import annotations

from docx import Document

from app.services.resume_extraction.cleaner import TextCleaner
from app.services.resume_extraction.models import ParsedDocument
from app.services.resume_extraction.parsers.base import BaseDocumentParser, DocumentExtractionError


class DocxParser(BaseDocumentParser):
    """DOCX document parser extracting both paragraphs and table rows via python-docx."""

    supported_extensions = ("docx",)

    def parse(self, file_path: str) -> ParsedDocument:
        try:
            doc = Document(file_path)
            blocks: list[str] = [para.text for para in doc.paragraphs if para.text and para.text.strip()]
            table_rows = 0
            for table in doc.tables:
                for row in table.rows:
                    cells = [cell.text.strip() for cell in row.cells if cell.text and cell.text.strip()]
                    if cells:
                        blocks.append(" | ".join(cells))
                        table_rows += 1
        except Exception as exc:
            raise DocumentExtractionError(f"DOCX extraction failed: {exc}") from exc

        raw_text = "\n".join(blocks)
        cleaned_text = TextCleaner.clean(raw_text)
        return ParsedDocument(
            file_path=file_path,
            file_type="docx",
            parser_used="python-docx",
            raw_text=raw_text,
            cleaned_text=cleaned_text,
            pages=[cleaned_text] if cleaned_text else [],
            page_count=1 if cleaned_text else 0,
            metadata={"paragraph_count": len(doc.paragraphs), "table_rows_extracted": table_rows},
        )
