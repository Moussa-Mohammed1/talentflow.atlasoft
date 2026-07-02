from __future__ import annotations

from pydantic import BaseModel, Field


class IdentityFieldRead(BaseModel):
    value: str | None = None
    confidence: float = 0.0
    evidence: list[str] = Field(default_factory=list)


class NameCandidateRead(BaseModel):
    value: str = ""
    score: int = 0
    signals: list[str] = Field(default_factory=list)


class NameExtractionRead(BaseModel):
    full_name: str = ""
    confidence: float = 0.0
    score: int = 0
    candidates: list[NameCandidateRead] = Field(default_factory=list)


class ResumeIdentityRead(BaseModel):
    name: NameExtractionRead = Field(default_factory=NameExtractionRead)
    email: IdentityFieldRead = Field(default_factory=IdentityFieldRead)
    phone: IdentityFieldRead = Field(default_factory=IdentityFieldRead)
    photo: str | None = None
