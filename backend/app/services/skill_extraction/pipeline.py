from __future__ import annotations

from collections import defaultdict


from sqlalchemy.orm import Session

from app.services.skill_extraction.candidate_extractor import CandidateExtractor
from app.services.skill_extraction.constants import COMPETENCY_FAMILY, TECHNOLOGY_FAMILY
from app.services.skill_extraction.models import SectionSpan, SkillExtractionResult, SkillMention
from app.services.skill_extraction.ontology import SkillOntology
from app.services.skill_extraction.scorer import SkillScorer
from app.services.skill_extraction.section_analyzer import ResumeSectionAnalyzer


class ResumeSkillExtractionPipeline:
    def __init__(self, db: Session | None = None, recruiter_id: int | None = None) -> None:
        self.ontology = SkillOntology()
        self.section_analyzer = ResumeSectionAnalyzer()
        self.extractor = CandidateExtractor(self.ontology)
        self.scorer = SkillScorer(self.ontology, db=db, recruiter_id=recruiter_id)

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

    @staticmethod
    def _merge_mentions(existing: SkillMention, incoming: SkillMention) -> SkillMention:
        primary = incoming if incoming.confidence > existing.confidence else existing
        evidence = sorted({*existing.evidence, *incoming.evidence})
        sources = sorted({*existing.sources, *incoming.sources})
        count = existing.count + incoming.count
        confidence = min(1.0, round(max(existing.confidence, incoming.confidence) + min(0.05, 0.01 * count), 4))
        scores = dict(primary.scores)
        scores["frequency"] = max(existing.scores.get("frequency", 0.0), incoming.scores.get("frequency", 0.0))
        scores["source"] = max(existing.scores.get("source", 0.0), incoming.scores.get("source", 0.0))

        return SkillMention(
            original=primary.original,
            normalized=primary.normalized,
            category=primary.category,
            confidence=confidence,
            section=primary.section,
            sources=sources,
            evidence=evidence,
            count=count,
            scores=scores,
            canonical=primary.canonical,
            exact_span=primary.exact_span,
            matched_alias=primary.matched_alias,
            section_source=primary.section_source,
        )

    def _line_for_skill(self, text: str, skill_name: str) -> str | None:
        skill_key = self.ontology.normalize_key(skill_name)
        if not skill_key:
            return None
        for line in text.splitlines():
            if skill_key in self.ontology.normalize_key(line):
                return line.strip()
        return None

    def _mention_from_llm_item(self, item: dict[str, object], text: str) -> SkillMention | None:
        name = str(item.get("name", "") or item.get("skill", "")).strip()
        if not name:
            return None

        normalized = self.ontology.normalize(name)
        category = str(item.get("category", "") or "Technology").strip() or "Technology"
        confidence_value = item.get("confidence", 0.68)
        try:
            confidence = float(confidence_value)
        except (TypeError, ValueError):
            confidence = 0.68
        confidence = max(0.55, min(0.88, confidence))

        evidence = str(item.get("evidence", "") or "").strip()
        if not evidence:
            evidence = self._line_for_skill(text, name) or name

        return SkillMention(
            original=name,
            normalized=normalized,
            category=category,
            confidence=confidence,
            section="llm_review",
            sources=["llm"],
            evidence=[evidence],
            count=1,
            scores={
                "validation": round(confidence, 4),
                "semantic": 0.0,
                "ontology": 0.0,
                "embedding": 0.0,
                "llm": round(confidence, 4),
                "section": 0.0,
                "source": 1.0,
                "context": 0.0,
                "frequency": 0.0,
            },
            canonical=None,
            exact_span=evidence,
            matched_alias=name,
            section_source="llm_review",
        )

    def _apply_llm_review(self, text: str, skill_mentions: list[SkillMention]) -> tuple[list[SkillMention], dict[str, object]]:
        review_payload = [
            {
                "name": mention.normalized,
                "category": mention.category,
                "confidence": mention.confidence,
                "evidence": mention.evidence[:3],
            }
            for mention in skill_mentions
        ]
        review = self.scorer.llm_verifier.review_resume_skills(text, review_payload,
            db=self.scorer._db, recruiter_id=self.scorer._recruiter_id)
        stats: dict[str, object] = {
            "available": review.available,
            "provider": review.provider,
            "reason": review.reason,
            "accepted_count": len(review.accepted_skills),
            "rejected_count": len(review.rejected_skills),
        }
        if not review.available or not review.accepted_skills:
            return skill_mentions, stats

        rejected_names = {
            self.ontology.normalize_key(str(item.get("name", "")))
            for item in review.rejected_skills
            if isinstance(item, dict)
        }
        reviewed: list[SkillMention] = [
            mention
            for mention in skill_mentions
            if self.ontology.normalize_key(mention.normalized) not in rejected_names
        ]

        existing_keys = {self.ontology.normalize_key(mention.normalized) for mention in reviewed}
        for item in review.accepted_skills:
            name = str(item.get("name", "") or item.get("skill", "")).strip()
            key = self.ontology.normalize_key(name)
            if not key or key in existing_keys:
                continue
            mention = self._mention_from_llm_item(item, text)
            if mention is None:
                continue
            reviewed.append(mention)
            existing_keys.add(key)

        return reviewed, stats

    def analyze(self, text: str) -> SkillExtractionResult:
        try:
            from sentence_transformers import SentenceTransformer
        except Exception:
            SentenceTransformer = None

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
        skill_mentions, llm_review_stats = self._apply_llm_review(text, skill_mentions)

        deduped_mentions: dict[str, SkillMention] = {}
        for mention in skill_mentions:
            existing = deduped_mentions.get(mention.normalized)
            if existing is None:
                deduped_mentions[mention.normalized] = mention
            else:
                deduped_mentions[mention.normalized] = self._merge_mentions(existing, mention)

        skill_mentions = sorted(deduped_mentions.values(), key=lambda skill: (-skill.confidence, skill.normalized.casefold()))
        grouped_by_category = self._group_skills(skill_mentions)
        technologies, competencies = self._group_families(grouped_by_category)
        stats = {
            "candidate_count": len(candidates),
            "skill_count": len(skill_mentions),
            "model_available": SentenceTransformer is not None,
            "dynamic_extraction": True,
            "static_skill_dictionary_required": False,
            "architecture": [
                "section_detection",
                "candidate_generation",
                "ontology_match",
                "embedding_similarity",
                "llm_fallback",
                "deduplication_normalization",
            ],
            "ontology_matcher": "local_plus_configured_external_taxonomy",
            "embedding_similarity_available": self.scorer.embedding_matcher.available,
            "llm_fallback_available": self.scorer.llm_verifier.available,
            "llm_review": llm_review_stats,
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
    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                 db: Session | None = None, recruiter_id: int | None = None):
        self.model_name = model_name
        self.pipeline = ResumeSkillExtractionPipeline(db=db, recruiter_id=recruiter_id)

    def extract_skills(self, text: str) -> dict[str, object]:
        return self.pipeline.analyze(text).to_dict()
