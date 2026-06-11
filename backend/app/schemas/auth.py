from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    must_change_password: bool

class UserResponse(BaseModel):
    id: int
    fullname: str
    email: str
    role: UserRole
    is_active: bool
    must_change_password: bool

    model_config = {
        "from_attributes": True
    }