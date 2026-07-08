from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AdminUserResponse(BaseModel):
    id: int
    fullname: str
    email: str
    avatar: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    resume_count: int = 0
    successful_llm_requests: int = 0

    class Config:
        from_attributes = True
