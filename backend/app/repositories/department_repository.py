from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


class DepartmentRepository:

    @staticmethod
    def get_all(db: Session) -> list[Department]:
        return db.query(Department).order_by(Department.name).all()

    @staticmethod
    def get_by_id(db: Session, department_id: int) -> Department | None:
        return db.query(Department).filter(Department.id == department_id).first()

    @staticmethod
    def get_by_name(db: Session, name: str) -> Department | None:
        return db.query(Department).filter(Department.name == name).first()

    @staticmethod
    def create(db: Session, data: DepartmentCreate) -> Department:
        dept = Department(name=data.name, required_exp_years=data.required_exp_years)
        db.add(dept)
        db.commit()
        db.refresh(dept)
        return dept

    @staticmethod
    def update(db: Session, department: Department, data: DepartmentUpdate) -> Department:
        if data.name is not None:
            department.name = data.name
        if data.required_exp_years is not None:
            department.required_exp_years = data.required_exp_years
        db.commit()
        db.refresh(department)
        return department

    @staticmethod
    def delete(db: Session, department: Department) -> None:
        db.delete(department)
        db.commit()
