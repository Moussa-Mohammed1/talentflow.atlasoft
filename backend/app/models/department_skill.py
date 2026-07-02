from sqlalchemy import Column, Integer, ForeignKey, String
from app.core.database import Base

class DepartmentSkills(Base):
    __tablename__ = 'department_skills'

    id = Column(Integer, primary_key=True, index=True)

    departement_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    title = Column(String, nullable=False)