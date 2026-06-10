from sqlalchemy import (
    Integer,
    String,
    DateTime,
    Column,
    Boolean,
    Enum as SQLEnum
)

from datetime import datetime
from enum import Enum
from app.core.database import Base

class UserRole(str, Enum):
    ADMIN = "admin"
    RECRUITER = "recruiter"
    EMPLOYEE = "employee"

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )
    role = Column(
        SQLEnum(UserRole, name="user_role_enum"), 
        default=UserRole.RECRUITER
    )
    fullname = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        nullable=False,
        unique=True,
        index=True
    )

    hashed_password = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        nullable=False,
        default="RECRUITER"
    )

    is_active = Column(
        Boolean,
        default=True
    )

    must_change_password = Column(
        Boolean,
        default=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )