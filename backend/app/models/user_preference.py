from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from app.core.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Notification preferences
    email_new_candidate = Column(Boolean, default=True, nullable=False)
    email_invitation_accepted = Column(Boolean, default=True, nullable=False)
    email_system_updates = Column(Boolean, default=True, nullable=False)

    # UI preferences
    theme = Column(String, default="system", nullable=False)
    language = Column(String, default="fr", nullable=False)
    items_per_page = Column(Integer, default=20, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
