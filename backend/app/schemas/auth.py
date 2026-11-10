from pydantic import BaseModel, EmailStr
from app.models.user import UserRole
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    fullname: str
    email: str
    role: UserRole
    is_active: bool
    must_change_password: bool
    avatar: Optional[str] = None
    email_verified: bool = False
    email_verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    must_change_password: bool


class UpdateProfileRequest(BaseModel):
    fullname: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str


class LLMUsageByAction(BaseModel):
    action: str
    count: int


class UserStatsResponse(BaseModel):
    resume_count: int = 0
    successful_llm_requests: int = 0
    llm_usage_by_action: list[LLMUsageByAction] = []
    invitations_sent: int = 0
    invitations_accepted: int = 0
    invitations_refused: int = 0