from __future__ import annotations

import math
import re

from sqlalchemy.orm import Session

from app.models.candidat import Candidat
from app.models.embeddings import CandidateEmbedding
from app.schemas.evaluation_checks import (
    EvalCaseResult,
    EvalSuiteReport,
    ExtractionEvalCase,
    GroundingEvalCase,
    MatchEvalCandidate,
    MatchEvalCase,
    RunEvalRequest,
    RunEvalResponse,
)
from app.schemas.matching import ExplainableMatchSignals
from app.schemas.rag import GroundedContextBundle, GroundedEvidenceItem
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer
from app.services.cv_pipeline.spacy_ner import SpacyNERExtractor
from app.services.embeddings.embedder import EmbeddingService
from app.services.evaluation_checks.datasets import (
    EXTRACTION_EVAL_DATASET,
    GROUNDING_EVAL_DATASET,
    MATCHING_EVAL_DATASET,
)
from app.services.llm_observability import (
    observe_span,
    record_langfuse_score,
    sync_langfuse_dataset_item,
)
from app.services.matching.hybrid_matcher import HybridMatchingService
from app.services.rag.grounding import GroundingVerifier

_LANGUAGE_DETECTION_TOKENS: dict[str, tuple[str, ...]] = {
    "English": ("english", "anglais"),
    "French": ("french", "français", "francais"),
    "Arabic": ("arabic", "arabe"),
    "Spanish": ("spanish", "espagnol"),
    "German": ("german", "allemand"),
}


class EvaluationChecksRunner:
    """Runs automated extraction accuracy, match relevance, and grounding evaluation checks."""

    def __init__(
        self,
        db: Session | None = None,
        *,
        embedder: EmbeddingService | None = None,
        normalizer: CVAttributeNormalizer | None = None,
    ) -> None:
        self.db = db
        self.embedder = embedder or EmbeddingService()
        self.normalizer = normalizer or CVAttributeNormalizer()
        self.ner = SpacyNERExtractor()

    @staticmethod
    def _precision_recall_f1(predicted: set[str], expected: set[str]) -> tuple[float, float, float]:
        if not expected and not predicted:
            return 1.0, 1.0, 1.0
        if not expected or not predicted:
            return 0.0, 0.0, 0.0
        tp = len(predicted & expected)
        precision = tp / len(predicted)
        recall = tp / len(expected)
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        return round(precision, 4), round(recall, 4), round(f1, 4)

    def _extract_skills_and_languages_from_text(self, raw_text: str) -> tuple[list[str], list[str]]:
        lowered = self.normalizer.ontology.normalize_key(raw_text)
        found_skills: list[str] = []
        seen_skills: set[str] = set()
        for concept in self.normalizer.ontology.concepts:
            for alias in (concept.canonical, *concept.aliases):
                alias_key = self.normalizer.ontology.normalize_key(alias)
                if not alias_key or len(alias_key) < 2:
                    continue
                if f" {alias_key} " in f" {lowered} " and concept.canonical.casefold() not in seen_skills:
                    seen_skills.add(concept.canonical.casefold())
                    found_skills.append(concept.canonical)
                    break

        text_cf = raw_text.casefold()
        found_langs: list[str] = []
        for canonical_lang, tokens in _LANGUAGE_DETECTION_TOKENS.items():
            if any(re.search(rf"\b{re.escape(tok)}\b", text_cf) for tok in tokens):
                found_langs.append(canonical_lang)

        return found_skills, found_langs

    def run_extraction_eval(
        self,
        cases: list[ExtractionEvalCase] | None = None,
        *,
        sync_langfuse: bool = False,
    ) -> EvalSuiteReport:
        dataset = cases or EXTRACTION_EVAL_DATASET
        results: list[EvalCaseResult] = []
        skill_f1s: list[float] = []
        lang_f1s: list[float] = []
        role_hits: list[float] = []
        loc_hits: list[float] = []
        langfuse_synced = False

        with observe_span(
            "evals.extraction_accuracy",
            as_type="evaluator",
            input_data={"total_cases": len(dataset)},
            tags=["eval", "extraction"],
        ) as span:
            for case in dataset:
                if sync_langfuse:
                    langfuse_synced = (
                        sync_langfuse_dataset_item(
                            dataset_name="talentflow-extraction-eval",
                            item_id=case.case_id,
                            input_data={"raw_text": case.raw_text},
                            expected_output={
                                "skills": case.expected_skills,
                                "languages": case.expected_languages,
                                "role": case.expected_role,
                                "location": case.expected_location,
                            },
                        )
                        or langfuse_synced
                    )

                pred_skills, pred_langs = self._extract_skills_and_languages_from_text(case.raw_text)
                ner_summary = self.ner.extract(case.raw_text)

                exp_skills = {self.normalizer.normalize_skill_name(s).casefold() for s in case.expected_skills}
                pred_skill_set = {s.casefold() for s in pred_skills}
                s_prec, s_rec, s_f1 = self._precision_recall_f1(pred_skill_set, exp_skills)

                exp_langs = {self.normalizer.normalize_language_name(lang).casefold() for lang in case.expected_languages}
                pred_lang_set = {lang.casefold() for lang in pred_langs}
                _, _, l_f1 = self._precision_recall_f1(pred_lang_set, exp_langs)

                role_hit = 1.0
                if case.expected_role:
                    role_cf = case.expected_role.casefold()
                    role_hit = (
                        1.0
                        if any(role_cf in r.casefold() or r.casefold() in role_cf for r in ner_summary.roles)
                        or role_cf in case.raw_text.casefold()
                        else 0.0
                    )

                loc_hit = 1.0
                if case.expected_location:
                    loc_cf = case.expected_location.casefold()
                    loc_hit = (
                        1.0
                        if any(loc_cf in loc.casefold() for loc in ner_summary.locations)
                        else 0.0
                    )

                passed = s_f1 >= 0.8 and l_f1 >= 0.8 and role_hit >= 1.0
                skill_f1s.append(s_f1)
                lang_f1s.append(l_f1)
                role_hits.append(role_hit)
                loc_hits.append(loc_hit)

                results.append(
                    EvalCaseResult(
                        case_id=case.case_id,
                        suite="extraction",
                        passed=passed,
                        metrics={
                            "skill_precision": s_prec,
                            "skill_recall": s_rec,
                            "skill_f1": s_f1,
                            "language_f1": l_f1,
                            "role_hit": role_hit,
                            "location_hit": loc_hit,
                        },
                        details={
                            "predicted_skills": pred_skills,
                            "predicted_languages": pred_langs,
                            "ner_locations": ner_summary.locations,
                            "ner_roles": ner_summary.roles,
                        },
                    )
                )

            passed_count = sum(1 for r in results if r.passed)
            agg = {
                "mean_skill_f1": round(sum(skill_f1s) / len(skill_f1s), 4) if skill_f1s else 0.0,
                "mean_language_f1": round(sum(lang_f1s) / len(lang_f1s), 4) if lang_f1s else 0.0,
                "role_accuracy": round(sum(role_hits) / len(role_hits), 4) if role_hits else 0.0,
                "location_accuracy": round(sum(loc_hits) / len(loc_hits), 4) if loc_hits else 0.0,
            }
            record_langfuse_score(
                name="eval_extraction_skill_f1",
                value=agg["mean_skill_f1"],
                trace_id=span.trace_id,
            )
            record_langfuse_score(
                name="eval_extraction_language_f1",
                value=agg["mean_language_f1"],
                trace_id=span.trace_id,
            )
            span.set_output(agg)

            return EvalSuiteReport(
                suite="extraction",
                total_cases=len(results),
                passed_cases=passed_count,
                failed_cases=len(results) - passed_count,
                pass_rate=round(passed_count / len(results), 4) if results else 0.0,
                aggregate_metrics=agg,
                results=results,
                trace_id=span.trace_id,
                langfuse_synced=langfuse_synced,
            )

    def run_matching_eval(
        self,
        cases: list[MatchEvalCase] | None = None,
        *,
        sync_langfuse: bool = False,
    ) -> EvalSuiteReport:
        dataset = cases or MATCHING_EVAL_DATASET
        matcher = HybridMatchingService(self.db, embedder=self.embedder, normalizer=self.normalizer)  # type: ignore[arg-type]

        results: list[EvalCaseResult] = []
        mrr_scores: list[float] = []
        ndcg3_scores: list[float] = []
        top1_hits: list[float] = []
        langfuse_synced = False

        with observe_span(
            "evals.match_relevance",
            as_type="evaluator",
            input_data={"total_cases": len(dataset)},
            tags=["eval", "matching"],
        ) as span:
            for case in dataset:
                if sync_langfuse:
                    langfuse_synced = (
                        sync_langfuse_dataset_item(
                            dataset_name="talentflow-matching-eval",
                            item_id=case.case_id,
                            input_data={
                                "job_query": case.job_query,
                                "required_skills": case.required_skills,
                            },
                            expected_output={"expected_top_candidate_id": case.expected_top_candidate_id},
                        )
                        or langfuse_synced
                    )

                query_vec, _ = self.embedder.embed_text(case.job_query)
                ranked: list[tuple[MatchEvalCandidate, float]] = []
                for cand_spec in case.candidates:
                    cand_text = (
                        f"{cand_spec.fullname} | {cand_spec.current_role or ''} | "
                        f"{cand_spec.location or ''} | Skills: {', '.join(cand_spec.skills)} | "
                        f"{cand_spec.summary}"
                    )
                    cand_vec, _ = self.embedder.embed_text(cand_text)
                    fake_cand = Candidat(
                        id=cand_spec.candidate_id,
                        resume_id=cand_spec.candidate_id,
                        fullname=cand_spec.fullname,
                        email=f"cand{cand_spec.candidate_id}@example.com",
                        phone="",
                        current_role=cand_spec.current_role,
                        location=cand_spec.location,
                        total_experience_years=cand_spec.total_experience_years,
                    )
                    fake_chunk = CandidateEmbedding(
                        candidate_id=cand_spec.candidate_id,
                        chunk_type="profile",
                        chunk_index=0,
                        chunk_text=cand_text,
                        model_name=self.embedder.active_model_name,
                        embedding=cand_vec,
                    )
                    signals = matcher._compute_explainable_signals(
                        candidat=fake_cand,
                        candidate_skills=[self.normalizer.normalize_skill_name(s) for s in cand_spec.skills],
                        candidate_chunks=[fake_chunk],
                        query_embedding=query_vec,
                        pg_min_distance=None,
                        required_skills=[self.normalizer.normalize_skill_name(s) for s in case.required_skills],
                        preferred_skills=[self.normalizer.normalize_skill_name(s) for s in case.preferred_skills],
                        target_role=case.target_role,
                        target_location=case.target_location,
                        required_experience_years=case.min_experience_years,
                        semantic_weight=0.55,
                        structured_weight=0.45,
                    )
                    ranked.append((cand_spec, signals.hybrid_score))

                ranked.sort(key=lambda item: item[1], reverse=True)
                ordered_ids = [item[0].candidate_id for item in ranked]

                # Reciprocal Rank for first relevant or expected top candidate
                rr = 0.0
                for idx, (c_spec, _) in enumerate(ranked, start=1):
                    if c_spec.candidate_id == case.expected_top_candidate_id:
                        rr = 1.0 / idx
                        break

                top1_hit = 1.0 if ordered_ids and ordered_ids[0] == case.expected_top_candidate_id else 0.0

                # NDCG@3
                dcg = 0.0
                for idx, (c_spec, _) in enumerate(ranked[:3], start=1):
                    dcg += (2**c_spec.relevance_grade - 1) / math.log2(idx + 1)
                ideal_grades = sorted([c.relevance_grade for c in case.candidates], reverse=True)[:3]
                idcg = sum((2**g - 1) / math.log2(idx + 1) for idx, g in enumerate(ideal_grades, start=1))
                ndcg3 = round(dcg / idcg, 4) if idcg > 0 else 1.0

                passed = top1_hit == 1.0 and ndcg3 >= 0.85
                mrr_scores.append(rr)
                ndcg3_scores.append(ndcg3)
                top1_hits.append(top1_hit)

                results.append(
                    EvalCaseResult(
                        case_id=case.case_id,
                        suite="matching",
                        passed=passed,
                        metrics={
                            "top1_hit": top1_hit,
                            "reciprocal_rank": round(rr, 4),
                            "ndcg_at_3": ndcg3,
                        },
                        details={
                            "ranked_candidate_ids": ordered_ids,
                            "scores": {str(c.candidate_id): score for c, score in ranked},
                        },
                    )
                )

            passed_count = sum(1 for r in results if r.passed)
            agg = {
                "mrr": round(sum(mrr_scores) / len(mrr_scores), 4) if mrr_scores else 0.0,
                "mean_ndcg_at_3": round(sum(ndcg3_scores) / len(ndcg3_scores), 4) if ndcg3_scores else 0.0,
                "top1_hit_rate": round(sum(top1_hits) / len(top1_hits), 4) if top1_hits else 0.0,
            }
            record_langfuse_score(name="eval_matching_mrr", value=agg["mrr"], trace_id=span.trace_id)
            record_langfuse_score(name="eval_matching_ndcg_at_3", value=agg["mean_ndcg_at_3"], trace_id=span.trace_id)
            span.set_output(agg)

            return EvalSuiteReport(
                suite="matching",
                total_cases=len(results),
                passed_cases=passed_count,
                failed_cases=len(results) - passed_count,
                pass_rate=round(passed_count / len(results), 4) if results else 0.0,
                aggregate_metrics=agg,
                results=results,
                trace_id=span.trace_id,
                langfuse_synced=langfuse_synced,
            )

    def run_grounding_eval(
        self,
        cases: list[GroundingEvalCase] | None = None,
        *,
        sync_langfuse: bool = False,
    ) -> EvalSuiteReport:
        dataset = cases or GROUNDING_EVAL_DATASET
        results: list[EvalCaseResult] = []
        scores: list[float] = []
        langfuse_synced = False

        with observe_span(
            "evals.grounding_fidelity",
            as_type="evaluator",
            input_data={"total_cases": len(dataset)},
            tags=["eval", "grounding"],
        ) as span:
            for case in dataset:
                if sync_langfuse:
                    langfuse_synced = (
                        sync_langfuse_dataset_item(
                            dataset_name="talentflow-grounding-eval",
                            item_id=case.case_id,
                            input_data={
                                "generated_text": case.generated_text,
                                "claims": case.claims,
                            },
                            expected_output={"expected_grounded": case.expected_grounded},
                        )
                        or langfuse_synced
                    )

                evidence = [
                    GroundedEvidenceItem(
                        source_id=eid,
                        source_type="candidate_attribute",
                        label=eid,
                        excerpt=", ".join(case.candidate_skills) if "skills" in eid else f"{case.candidate_experience_years} years",
                    )
                    for eid in case.available_evidence_ids
                ]
                bundle = GroundedContextBundle(
                    candidate_id=1,
                    candidate_name="Eval Candidate",
                    candidate_experience_years=case.candidate_experience_years,
                    candidate_skills=case.candidate_skills,
                    match_signals=ExplainableMatchSignals(
                        semantic_similarity=0.8,
                        semantic_score=80.0,
                        structured_score=80.0,
                        hybrid_score=80.0,
                        missing_skills=case.missing_skills,
                    ),
                    evidence=evidence,
                )
                check = GroundingVerifier.verify(
                    bundle,
                    claims=case.claims,
                    generated_text=case.generated_text,
                )
                passed = check.passed == case.expected_grounded
                scores.append(check.grounding_score)
                results.append(
                    EvalCaseResult(
                        case_id=case.case_id,
                        suite="grounding",
                        passed=passed,
                        metrics={
                            "grounding_score": check.grounding_score,
                            "expected_grounded": 1.0 if case.expected_grounded else 0.0,
                            "actual_grounded": 1.0 if check.passed else 0.0,
                        },
                        details={
                            "unsupported_claims": check.unsupported_claims,
                            "invalid_evidence_ids": check.invalid_evidence_ids,
                        },
                    )
                )

            passed_count = sum(1 for r in results if r.passed)
            agg = {
                "classification_accuracy": round(passed_count / len(results), 4) if results else 0.0,
                "mean_grounding_score": round(sum(scores) / len(scores), 4) if scores else 0.0,
            }
            record_langfuse_score(
                name="eval_grounding_accuracy",
                value=agg["classification_accuracy"],
                trace_id=span.trace_id,
            )
            span.set_output(agg)

            return EvalSuiteReport(
                suite="grounding",
                total_cases=len(results),
                passed_cases=passed_count,
                failed_cases=len(results) - passed_count,
                pass_rate=round(passed_count / len(results), 4) if results else 0.0,
                aggregate_metrics=agg,
                results=results,
                trace_id=span.trace_id,
                langfuse_synced=langfuse_synced,
            )

    def run(self, request: RunEvalRequest) -> RunEvalResponse:
        with observe_span(
            "evals.run_all",
            as_type="evaluator",
            input_data=request.model_dump(),
            tags=["eval"],
        ) as span:
            reports: list[EvalSuiteReport] = []
            if request.suite in ("all", "extraction"):
                reports.append(self.run_extraction_eval(sync_langfuse=request.sync_langfuse_datasets))
            if request.suite in ("all", "matching"):
                reports.append(self.run_matching_eval(sync_langfuse=request.sync_langfuse_datasets))
            if request.suite in ("all", "grounding"):
                reports.append(self.run_grounding_eval(sync_langfuse=request.sync_langfuse_datasets))

            total = sum(r.total_cases for r in reports)
            passed = sum(r.passed_cases for r in reports)
            overall_rate = round(passed / total, 4) if total else 0.0
            span.set_output({"overall_pass_rate": overall_rate, "suites": [r.suite for r in reports]})
            return RunEvalResponse(
                reports=reports,
                overall_pass_rate=overall_rate,
                trace_id=span.trace_id,
            )
