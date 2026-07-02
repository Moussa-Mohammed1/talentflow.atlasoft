from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentResponse, DepartmentUpdate
from app.services.department_service import DepartmentService

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("", response_model=list[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DepartmentResponse]:
    return DepartmentService.list_departments(db, current_user)


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepartmentResponse:
    return DepartmentService.get_department(db, department_id, current_user)


@router.post("", response_model=DepartmentResponse, status_code=201)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepartmentResponse:
    return DepartmentService.create_department(db, payload, current_user)


@router.patch("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DepartmentResponse:
    return DepartmentService.update_department(db, department_id, payload, current_user)


@router.delete("/{department_id}", status_code=204)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    DepartmentService.delete_department(db, department_id, current_user)
