from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    required_exp_years: int = Field(..., ge=0)
    required_skills: Optional[str] = Field(
        None,
        description="Compétences requises séparées par le symbole +",
    )


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    required_exp_years: Optional[int] = Field(None, ge=0)
    required_skills: Optional[str] = Field(
        None,
        description="Compétences requises séparées par le symbole +",
    )


class DepartmentResponse(BaseModel):
    id: int
    name: str
    required_exp_years: int
    required_skills: list[str] = []
    created_at: Optional[datetime] = None
