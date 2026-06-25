from sqlalchemy.orm import Session

from app.models.candidat_skill import CandidatSkills
from app.models.skills import Skills
from app.models.skills_category import SkillsCategory
from app.schemas.skill_extraction import SkillItemRead


class SkillRepository:
    @staticmethod
    def find_or_create_category(db: Session, name: str) -> SkillsCategory:
        category = db.query(SkillsCategory).filter(SkillsCategory.name == name).first()
        if not category:
            category = SkillsCategory(name=name)
            db.add(category)
            db.flush()
        return category

    @staticmethod
    def find_or_create_skill(db: Session, name: str, category_id: int) -> Skills:
        skill = db.query(Skills).filter(Skills.name == name).first()
        if not skill:
            skill = Skills(name=name, category_id=category_id)
            db.add(skill)
            db.flush()
        return skill

    @staticmethod
    def replace_for_candidate(
        db: Session,
        candidat_id: int,
        skills: list[SkillItemRead],
    ) -> list[CandidatSkills]:
        db.query(CandidatSkills).filter(
            CandidatSkills.candidat_id == candidat_id
        ).delete(synchronize_session=False)

        records = []
        for item in skills:
            category = SkillRepository.find_or_create_category(db, item.category)
            skill = SkillRepository.find_or_create_skill(db, item.name, category.id)
            link = CandidatSkills(candidat_id=candidat_id, skill_id=skill.id)
            db.add(link)
            records.append(link)

        db.commit()
        for record in records:
            db.refresh(record)
        return records
