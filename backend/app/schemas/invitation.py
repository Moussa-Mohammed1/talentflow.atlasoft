from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class InviteUserRequest(BaseModel):
    email: EmailStr


class ValidateInvitationResponse(BaseModel):
    email: EmailStr
    valid: bool


class AcceptInvitationRequest(BaseModel):
    token: str
    fullname: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8)


class InvitationResponse(BaseModel):
    id: int
    email: EmailStr
    accepted: bool
    expires_at: datetime
    created_at: datetime
    invited_by_name: str