from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.department_skill import DepartmentSkills
from app.repositories.department_repository import DepartmentRepository
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.models.user import User


class DepartmentService:

    @staticmethod
    def _parse_skills(raw: str | None) -> list[str]:
        if not raw or not raw.strip():
            return []
        return [s.strip() for s in raw.split("+") if s.strip()]

    @staticmethod
    def _get_skill_names(db: Session, department_id: int) -> list[str]:
        rows = (
            db.query(DepartmentSkills.title)
            .filter(DepartmentSkills.departement_id == department_id)
            .order_by(DepartmentSkills.title)
            .all()
        )
        return [r.title for r in rows]

    @staticmethod
    def _sync_skills(db: Session, department_id: int, skill_names: list[str]) -> None:
        db.query(DepartmentSkills).filter(DepartmentSkills.departement_id == department_id).delete()
        for name in skill_names:
            link = DepartmentSkills(departement_id=department_id, title=name)
            db.add(link)
        db.flush()

    @staticmethod
    def _build_response(db: Session, dept: Department) -> DepartmentResponse:
        return DepartmentResponse(
            id=dept.id,
            name=dept.name,
            required_exp_years=dept.required_exp_years,
            required_skills=DepartmentService._get_skill_names(db, dept.id),
            created_at=dept.created_at,
        )

    @staticmethod
    def list_departments(db: Session, _current_user: User) -> list[DepartmentResponse]:
        departments = DepartmentRepository.get_all(db)
        return [DepartmentService._build_response(db, d) for d in departments]

    @staticmethod
    def get_department(db: Session, department_id: int, _current_user: User) -> DepartmentResponse:
        dept = DepartmentRepository.get_by_id(db, department_id)
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable")
        return DepartmentService._build_response(db, dept)

    @staticmethod
    def create_department(db: Session, data: DepartmentCreate, _current_user: User) -> DepartmentResponse:
        existing = DepartmentRepository.get_by_name(db, data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un département avec ce nom existe déjà",
            )
        dept = DepartmentRepository.create(db, data)
        skill_names = DepartmentService._parse_skills(data.required_skills)
        if skill_names:
            DepartmentService._sync_skills(db, dept.id, skill_names)
            db.commit()
            db.refresh(dept)
        return DepartmentService._build_response(db, dept)

    @staticmethod
    def update_department(
        db: Session, department_id: int, data: DepartmentUpdate, _current_user: User
    ) -> DepartmentResponse:
        dept = DepartmentRepository.get_by_id(db, department_id)
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable")
        if data.name is not None and data.name != dept.name:
            existing = DepartmentRepository.get_by_name(db, data.name)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Un département avec ce nom existe déjà",
                )
        updated = DepartmentRepository.update(db, dept, data)
        if data.required_skills is not None:
            skill_names = DepartmentService._parse_skills(data.required_skills)
            DepartmentService._sync_skills(db, department_id, skill_names)
            db.commit()
            db.refresh(updated)
        return DepartmentService._build_response(db, updated)

    @staticmethod
    def delete_department(db: Session, department_id: int, _current_user: User) -> None:
        dept = DepartmentRepository.get_by_id(db, department_id)
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Département introuvable")
        db.query(DepartmentSkills).filter(DepartmentSkills.departement_id == department_id).delete()
        DepartmentRepository.delete(db, dept)
