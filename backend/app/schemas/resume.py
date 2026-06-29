from datetime import datetime
from fastapi import UploadFile
from pydantic import BaseModel, ConfigDict

class ResumeBase(BaseModel):
	path: str

class ResumeCreate(BaseModel):
	file: UploadFile

class ResumeRead(ResumeBase):
	id: int
	recruiter_id: int
	created_at: datetime | None = None
	model_config = ConfigDict(from_attributes=True)

class ResumeTextRead(BaseModel):
	raw_text: str | list

class ResumePathRequest(BaseModel):
	path: str

class ResumeIdRequest(BaseModel):
	resume_id: int

class DocumentListSchema(BaseModel):
	id: str
	name: str
	candidateName: str
	role: str
	importDate: str
	fileSize: str
	category: str
	previewUrl: str | None = None

class ResumeDetailSchema(BaseModel):
	id: str
	name: str
	candidateName: str
	role: str
	importDate: str
	fileSize: str
	category: str


class CandidatDetailSchema(BaseModel):
	id: int
	fullname: str
	email: str
	phone: str
	created_at: datetime | None = None


class ExperienceDetailSchema(BaseModel):
	id: int
	title: str
	description: str | None = None
	start_date: str
	end_date: str | None = None


class EducationDetailSchema(BaseModel):
	id: int
	institution: str
	degree: str | None = None
	field_of_study: str | None = None
	start_date: str | None = None
	end_date: str | None = None
	description: str | None = None


class CertificationDetailSchema(BaseModel):
	id: int
	name: str
	organization: str
	issue_date: str | None = None
	expiration_date: str | None = None
	credential_id: str | None = None
	credential_url: str | None = None
	description: str | None = None


class SkillDetailSchema(BaseModel):
	id: int
	name: str
	category_name: str


class LanguageDetailSchema(BaseModel):
	id: int
	name: str


class ResumeFullDetailSchema(BaseModel):
	resume_id: int
	candidat: CandidatDetailSchema
	experiences: list[ExperienceDetailSchema]
	educations: list[EducationDetailSchema]
	certifications: list[CertificationDetailSchema]
	skills: list[SkillDetailSchema]
	languages: list[LanguageDetailSchema]


class CandidatUpdateSchema(BaseModel):
	fullname: str | None = None
	email: str | None = None
	phone: str | None = None


class ExperienceUpdateSchema(BaseModel):
	title: str | None = None
	description: str | None = None
	start_date: str | None = None
	end_date: str | None = None


class EducationUpdateSchema(BaseModel):
	institution: str | None = None
	degree: str | None = None
	field_of_study: str | None = None
	start_date: str | None = None
	end_date: str | None = None
	description: str | None = None


class CertificationUpdateSchema(BaseModel):
	name: str | None = None
	organization: str | None = None
	issue_date: str | None = None
	expiration_date: str | None = None
	credential_id: str | None = None
	credential_url: str | None = None
	description: str | None = None
