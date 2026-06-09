from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from app.core.database import Base
from datetime import datetime

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, nullable=False)

    token = Column(String, nullable=False)

    expires_at = Column(DateTime)

    accepted = Column(Boolean, default=False)

    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)