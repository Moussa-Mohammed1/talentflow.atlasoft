from __future__ import annotations

from fastapi import HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from .resume_loader import ResumeLoader


class ResumePreviewService:
    """Generates PNG previews from resume PDFs."""

    @staticmethod
    def generate(db: Session, resume_id: int, recruiter_id: int) -> Response:
        resume = ResumeLoader.detail(db, resume_id, recruiter_id)
        file_path = ResumeLoader.resolve_path(resume.path)
        try:
            import fitz
            pdf_doc = fitz.open(file_path)
            page = pdf_doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
            return Response(content=pix.tobytes("png"), media_type="image/png")
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate preview")
