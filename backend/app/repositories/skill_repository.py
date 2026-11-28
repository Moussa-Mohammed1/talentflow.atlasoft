from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.candidat_skill import CandidatSkills
from app.models.skills import Skills
from app.models.skills_category import SkillsCategory
from app.schemas.skill_extraction import SkillItemRead
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer


class SkillRepository:
    @staticmethod
    def find_or_create_category(db: Session, name: str) -> SkillsCategory:
        clean_name = (name or "Technology").strip() or "Technology"
        category = (
            db.query(SkillsCategory)
            .filter(func.lower(SkillsCategory.name) == clean_name.casefold())
            .first()
        )
        if not category:
            category = SkillsCategory(name=clean_name)
            db.add(category)
            db.flush()
        return category

    @staticmethod
    def find_or_create_skill(db: Session, name: str, category_id: int) -> Skills:
        clean_name = (name or "").strip()
        skill = (
            db.query(Skills)
            .filter(func.lower(Skills.name) == clean_name.casefold())
            .first()
        )
        if not skill:
            skill = Skills(name=clean_name, category_id=category_id)
            db.add(skill)
            db.flush()
        return skill

    @staticmethod
    def replace_for_candidate(
        db: Session,
        candidat_id: int,
        skills: list[SkillItemRead],
        *,
        normalizer: CVAttributeNormalizer | None = None,
    ) -> list[CandidatSkills]:
        attr_normalizer = normalizer or CVAttributeNormalizer()
        normalized_skills = attr_normalizer.normalize_skills(skills)

        db.query(CandidatSkills).filter(
            CandidatSkills.candidat_id == candidat_id
        ).delete(synchronize_session=False)

        records: list[CandidatSkills] = []
        seen_skill_ids: set[int] = set()
        for item in normalized_skills:
            category = SkillRepository.find_or_create_category(db, item.category)
            skill = SkillRepository.find_or_create_skill(db, item.canonical_name, category.id)
            if skill.id in seen_skill_ids:
                continue
            seen_skill_ids.add(skill.id)
            link = CandidatSkills(candidat_id=candidat_id, skill_id=skill.id)
            db.add(link)
            records.append(link)

        db.commit()
        for record in records:
            db.refresh(record)
        return records
