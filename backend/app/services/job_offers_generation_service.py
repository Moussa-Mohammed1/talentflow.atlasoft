from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.repositories.department_repository import DepartmentRepository
from app.schemas.job_offers import JobOfferCreate, JobOfferRead
from app.services.LLM.validate_job_offers import LLMService
from app.services.job_offers_service import JobOffersService


class JobOffersGenerationService:
    def __init__(self, db: Session):
        self.db = db
        self.job_offers_service = JobOffersService(db)

    def generate_from_description(self, description: str) -> JobOfferRead:
        payload = LLMService.validate(description)
        job_in = self._build_create(payload)
        return self.job_offers_service.create(job_in)

    def _build_create(self, payload: dict[str, Any]) -> JobOfferCreate:
        department_id = self._resolve_department(payload.get("department_name"))

        return JobOfferCreate(
            title=str(payload.get("title", "Untitled Position")).strip(),
            description=str(payload.get("description", "")).strip() or None,
            responsibilities=str(payload.get("responsibilities", "")).strip() or None,
            department_id=department_id,
            employment_type=payload.get("employment_type", "full_time"),
            work_mode=payload.get("work_mode", "on_site"),
            seniority_level=payload.get("seniority_level", "mid"),
            openings=int(payload.get("openings", 1)),
        )

    def _resolve_department(self, department_name: object) -> int | None:
        if not department_name or not str(department_name).strip():
            return None
        dept = DepartmentRepository.get_by_name(self.db, str(department_name).strip())
        return dept.id if dept else None
