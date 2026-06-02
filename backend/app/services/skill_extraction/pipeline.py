from __future__ import annotations

from collections import defaultdict

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

from app.services.skill_extraction.candidate_extractor import CandidateExtractor
from app.services.skill_extraction.constants import COMPETENCY_FAMILY, TECHNOLOGY_FAMILY
from app.services.skill_extraction.models import SectionSpan, SkillExtractionResult, SkillMention
from app.services.skill_extraction.ontology import SkillOntology
from app.services.skill_extraction.scorer import SkillScorer
from app.services.skill_extraction.section_analyzer import ResumeSectionAnalyzer


class ResumeSkillExtractionPipeline:
    def __init__(self) -> None:
        self.ontology = SkillOntology()
        self.section_analyzer = ResumeSectionAnalyzer()
        self.extractor = CandidateExtractor(self.ontology)
        self.scorer = SkillScorer(self.ontology)

    @staticmethod
    def _group_skills(skills: list[SkillMention]) -> dict[str, list[SkillMention]]:
        grouped: dict[str, list[SkillMention]] = defaultdict(list)
        for skill in skills:
            grouped[skill.category].append(skill)
        return dict(sorted(grouped.items(), key=lambda item: item[0].casefold()))

    @staticmethod
    def _group_families(grouped_by_category: dict[str, list[SkillMention]]) -> tuple[list[SkillMention], list[SkillMention]]:
        technologies: list[SkillMention] = []
        competencies: list[SkillMention] = []
        for category, items in grouped_by_category.items():
            if category in TECHNOLOGY_FAMILY:
                technologies.extend(items)
            elif category in COMPETENCY_FAMILY:
                competencies.extend(items)
        technologies = sorted(technologies, key=lambda skill: (-skill.confidence, skill.normalized.casefold()))
        competencies = sorted(competencies, key=lambda skill: (-skill.confidence, skill.normalized.casefold()))
        return technologies, competencies

    def analyze(self, text: str) -> SkillExtractionResult:
        if not text or not text.strip():
            empty_stats = {"candidate_count": 0, "skill_count": 0, "model_available": False}
            return SkillExtractionResult(
                raw_text=text or "",
                sections=[],
                skills=[],
                technologies=[],
                competencies=[],
                skills_by_category={},
                stats=empty_stats,
            )

        sections = self.section_analyzer.analyze(text)
        if not sections:
            sections = [SectionSpan("profile", "", 1, max(1, len(text.splitlines())), 0, len(text), 0.55)]

        candidates = self.extractor.extract(text, sections)
        skill_mentions = self.scorer.build(candidates, sections, text)

        deduped_mentions: dict[str, SkillMention] = {}
        for mention in skill_mentions:
            existing = deduped_mentions.get(mention.normalized)
            if existing is None or mention.confidence > existing.confidence:
                deduped_mentions[mention.normalized] = mention

        skill_mentions = sorted(deduped_mentions.values(), key=lambda skill: (-skill.confidence, skill.normalized.casefold()))
        grouped_by_category = self._group_skills(skill_mentions)
        technologies, competencies = self._group_families(grouped_by_category)
        stats = {
            "candidate_count": len(candidates),
            "skill_count": len(skill_mentions),
            "model_available": SentenceTransformer is not None,
            "spacy_model": self.extractor._nlp.meta.get("name", "unknown") if hasattr(self.extractor._nlp, "meta") else "unknown",
        }

        return SkillExtractionResult(
            raw_text=text,
            sections=sections,
            skills=skill_mentions,
            technologies=technologies,
            competencies=competencies,
            skills_by_category=grouped_by_category,
            stats=stats,
        )


class PretrainedBilingualExtractor:
    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        self.model_name = model_name
        self.pipeline = ResumeSkillExtractionPipeline()

    def extract_skills(self, text: str) -> dict[str, object]:
        return self.pipeline.analyze(text).to_dict()