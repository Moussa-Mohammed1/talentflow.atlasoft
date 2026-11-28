from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class NEREntityRead(BaseModel):
    text: str
    label: str
    start_char: int = 0
    end_char: int = 0
    source: str = "spacy"


class NERExtractionSummary(BaseModel):
    spacy_model: str = "xx_blank"
    has_statistical_ner: bool = False
    persons: list[str] = Field(default_factory=list)
    organizations: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    roles: list[str] = Field(default_factory=list)
    entities: list[NEREntityRead] = Field(default_factory=list)


class NormalizedSkillSchema(BaseModel):
    raw_name: str
    canonical_name: str
    normalized_key: str
    category: str = "Technology"
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    section: str = "unknown"
    sources: list[str] = Field(default_factory=list)


class NormalizedExperienceSchema(BaseModel):
    title: str
    normalized_title: str
    company: str | None = None
    location: str | None = None
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    duration_years: float = 0.0
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class NormalizedEducationSchema(BaseModel):
    institution: str
    degree: str | None = None
    normalized_degree: str | None = None
    field_of_study: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    description: str | None = None
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class NormalizedCertificationSchema(BaseModel):
    name: str
    organization: str | None = None
    issue_date: datetime | None = None
    expiration_date: datetime | None = None
    credential_id: str | None = None
    credential_url: str | None = None
    description: str | None = None
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class NormalizedLanguageSchema(BaseModel):
    name: str
    normalized_name: str
    proficiency: str | None = None
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)


class CandidateIdentityAttributesSchema(BaseModel):
    fullname: str = ""
    email: str = ""
    phone: str = ""
    current_role: str | None = None
    location: str | None = None
    summary: str | None = None
    total_experience_years: float = 0.0


class StructuredCVProfile(BaseModel):
    """Validated, normalized structured representation of a parsed candidate CV."""

    raw_text: str
    cleaned_text: str
    parser_used: str = "unknown"
    file_type: str = "unknown"
    identity: CandidateIdentityAttributesSchema = Field(default_factory=CandidateIdentityAttributesSchema)
    skills: list[NormalizedSkillSchema] = Field(default_factory=list)
    experiences: list[NormalizedExperienceSchema] = Field(default_factory=list)
    educations: list[NormalizedEducationSchema] = Field(default_factory=list)
    certifications: list[NormalizedCertificationSchema] = Field(default_factory=list)
    languages: list[NormalizedLanguageSchema] = Field(default_factory=list)
    ner: NERExtractionSummary = Field(default_factory=NERExtractionSummary)
    stats: dict[str, Any] = Field(default_factory=dict)
