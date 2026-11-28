from __future__ import annotations

import html
import json
from typing import Any

from fastapi import HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models.recruitment import Recruitment
from app.schemas.rag import (
    GroundedCandidateSummaryResponse,
    GroundedContextBundle,
    GroundedDraftRequest,
    GroundedDraftResponse,
    GroundedSummaryRequest,
)
from app.services.llm_observability import observe_span, record_langfuse_score
from app.services.llm_router import LLMRouterError, LLMRouterService, parse_json_payload
from app.services.rag.grounding import GroundingVerifier
from app.services.rag.retriever import GroundedContextRetriever


class _CitationPayload(BaseModel):
    claim: str = Field(min_length=1)
    evidence_ids: list[str] = Field(default_factory=list)


class _SummaryLLMResponse(BaseModel):
    summary: str = Field(min_length=1)
    strengths: list[str] = Field(default_factory=list)
    risks_or_gaps: list[str] = Field(default_factory=list)
    recommended_next_step: str = Field(default="Review profile")
    citations: list[_CitationPayload] = Field(default_factory=list)


class _DraftLLMResponse(BaseModel):
    subject: str = Field(min_length=1)
    body: str = Field(min_length=1)
    citations: list[_CitationPayload] = Field(default_factory=list)


class GroundedRAGService:
    """Executes retrieval-grounded generation (summary, drafting, evaluation support) with verification."""

    def __init__(
        self,
        db: Session,
        *,
        retriever: GroundedContextRetriever | None = None,
    ) -> None:
        self.db = db
        self.retriever = retriever or GroundedContextRetriever(db)

    def generate_candidate_summary(
        self,
        request: GroundedSummaryRequest,
        *,
        recruiter_id: int | None = None,
        bundle: GroundedContextBundle | None = None,
    ) -> GroundedCandidateSummaryResponse:
        with observe_span(
            "rag.candidate_summary",
            as_type="chain",
            user_id=recruiter_id,
            input_data=request.model_dump(mode="json"),
            tags=["rag", "summary"],
        ) as span:
            resolved_bundle = bundle or self.retriever.retrieve(
                candidate_id=request.candidate_id,
                job_offer_id=request.job_offer_id,
                focus_query=request.focus_query,
                top_k_chunks=request.top_k_chunks,
                recruiter_id=recruiter_id,
            )

            parsed_payload: dict[str, Any] | None = None
            provider = "extractive_fallback"
            model = "deterministic-rag-v1"
            fallback_used = False

            if LLMRouterService.is_task_configured("general_rag", db=self.db):
                prompt = self._build_summary_prompt(resolved_bundle, focus_query=request.focus_query)
                try:
                    llm_result = LLMRouterService.generate(
                        task_category="general_rag",
                        prompt=prompt,
                        system_prompt=(
                            "You are an evidence-grounded ATS analyst. Only make claims supported by the "
                            "retrieved evidence IDs. Never invent skills, degrees, or years of experience."
                        ),
                        action="rag_candidate_summary",
                        db=self.db,
                        recruiter_id=recruiter_id,
                        json_mode=True,
                        validator=self._parse_summary_response,
                    )
                    parsed_payload = llm_result.parsed
                    provider = llm_result.provider
                    model = llm_result.model
                    fallback_used = llm_result.fallback_used
                except LLMRouterError:
                    fallback_used = True

            if parsed_payload is None:
                parsed_payload = self._build_extractive_summary_fallback(resolved_bundle)
                fallback_used = True

            full_text = " ".join(
                [
                    parsed_payload["summary"],
                    *parsed_payload.get("strengths", []),
                    *parsed_payload.get("risks_or_gaps", []),
                ]
            )
            check = GroundingVerifier.verify(
                resolved_bundle,
                claims=parsed_payload.get("citations", []),
                generated_text=full_text,
            )

            record_langfuse_score(
                name="rag_summary_grounding_score",
                value=check.grounding_score,
                trace_id=span.trace_id,
                comment=f"provider={provider} unsupported={len(check.unsupported_claims)}",
            )

            response = GroundedCandidateSummaryResponse(
                candidate_id=resolved_bundle.candidate_id,
                job_offer_id=resolved_bundle.job_offer_id,
                summary=parsed_payload["summary"],
                strengths=parsed_payload.get("strengths", []),
                risks_or_gaps=parsed_payload.get("risks_or_gaps", []),
                recommended_next_step=parsed_payload.get("recommended_next_step", "Review profile"),
                citations=check.citations,
                grounding_score=check.grounding_score,
                unsupported_claims=check.unsupported_claims,
                evidence_used=resolved_bundle.evidence,
                provider=provider,
                model=model,
                fallback_used=fallback_used,
                trace_id=span.trace_id,
            )
            span.set_output(
                {
                    "provider": provider,
                    "model": model,
                    "grounding_score": check.grounding_score,
                    "unsupported_claims_count": len(check.unsupported_claims),
                }
            )
            return response

    def draft_grounded_email(
        self,
        request: GroundedDraftRequest,
        *,
        recruiter_id: int | None = None,
        bundle: GroundedContextBundle | None = None,
    ) -> GroundedDraftResponse:
        with observe_span(
            "rag.draft_email",
            as_type="chain",
            user_id=recruiter_id,
            input_data=request.model_dump(mode="json"),
            tags=["rag", "drafting"],
        ) as span:
            candidate_id = request.candidate_id
            job_offer_id = request.job_offer_id

            if request.recruitment_id is not None:
                rec = (
                    self.db.query(Recruitment)
                    .filter(Recruitment.id == request.recruitment_id)
                    .first()
                )
                if rec is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Recruitment not found",
                    )
                candidate_id = candidate_id or rec.candidate_id
                job_offer_id = job_offer_id or rec.job_offer_id

            if candidate_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Either candidate_id or recruitment_id is required.",
                )

            resolved_bundle = bundle or self.retriever.retrieve(
                candidate_id=candidate_id,
                job_offer_id=job_offer_id,
                recruiter_id=recruiter_id,
            )

            parsed_payload: dict[str, Any] | None = None
            provider = "extractive_fallback"
            model = "deterministic-rag-v1"
            fallback_used = False

            if LLMRouterService.is_task_configured("general_rag", db=self.db):
                prompt = self._build_draft_prompt(resolved_bundle, request)
                try:
                    llm_result = LLMRouterService.generate(
                        task_category="general_rag",
                        prompt=prompt,
                        system_prompt=(
                            "You are a professional recruitment assistant. Draft emails strictly grounded in "
                            "the provided evidence IDs. Never claim skills or experience not present in the evidence."
                        ),
                        action="rag_grounded_email_draft",
                        db=self.db,
                        recruiter_id=recruiter_id,
                        json_mode=True,
                        validator=self._parse_draft_response,
                    )
                    parsed_payload = llm_result.parsed
                    provider = llm_result.provider
                    model = llm_result.model
                    fallback_used = llm_result.fallback_used
                except LLMRouterError:
                    fallback_used = True

            if parsed_payload is None:
                parsed_payload = self._build_extractive_email_fallback(resolved_bundle, request)
                fallback_used = True

            check = GroundingVerifier.verify(
                resolved_bundle,
                claims=parsed_payload.get("citations", []),
                generated_text=f"{parsed_payload['subject']}\n{parsed_payload['body']}",
            )

            record_langfuse_score(
                name="rag_draft_grounding_score",
                value=check.grounding_score,
                trace_id=span.trace_id,
                comment=f"draft_type={request.draft_type} provider={provider}",
            )

            response = GroundedDraftResponse(
                candidate_id=resolved_bundle.candidate_id,
                job_offer_id=resolved_bundle.job_offer_id,
                draft_type=request.draft_type,
                subject=parsed_payload["subject"],
                body=parsed_payload["body"],
                citations=check.citations,
                grounding_score=check.grounding_score,
                unsupported_claims=check.unsupported_claims,
                evidence_used=resolved_bundle.evidence,
                provider=provider,
                model=model,
                fallback_used=fallback_used,
                trace_id=span.trace_id,
            )
            span.set_output(
                {
                    "provider": provider,
                    "model": model,
                    "grounding_score": check.grounding_score,
                    "unsupported_claims_count": len(check.unsupported_claims),
                }
            )
            return response

    @staticmethod
    def _build_summary_prompt(bundle: GroundedContextBundle, *, focus_query: str | None = None) -> str:
        schema = {
            "summary": "2-4 sentence factual summary grounded strictly in the retrieved evidence.",
            "strengths": ["verified strength 1", "verified strength 2"],
            "risks_or_gaps": ["verified gap or missing requirement"],
            "recommended_next_step": "concrete next recruitment action",
            "citations": [
                {
                    "claim": "factual statement made in summary/strengths/gaps",
                    "evidence_ids": ["cand:1:profile"],
                }
            ],
        }
        focus_block = f"\nFocus Query: {focus_query.strip()}\n" if focus_query else ""
        return (
            "Produce a retrieval-grounded candidate evaluation summary.\n"
            "Rules:\n"
            "1. Use ONLY facts present in the Retrieved Grounding Evidence below.\n"
            "2. Every factual claim in `citations` MUST reference one or more exact `source_id` strings from the evidence.\n"
            "3. Never assert that the candidate possesses a skill listed in `missing_skills`.\n"
            "4. If information is missing from evidence, state that it is not evidenced.\n"
            "5. Return ONLY valid JSON matching the schema.\n"
            f"{focus_block}\n"
            f"{bundle.render_prompt_context()}\n\n"
            f"JSON Schema:\n{json.dumps(schema, ensure_ascii=False, indent=2)}"
        )

    @staticmethod
    def _build_draft_prompt(bundle: GroundedContextBundle, request: GroundedDraftRequest) -> str:
        schema = {
            "subject": "clear email subject",
            "body": "<p>HTML email body grounded in verified candidate and job details</p>",
            "citations": [
                {
                    "claim": "referenced candidate or job detail in the email",
                    "evidence_ids": ["cand:1:profile"],
                }
            ],
        }
        return (
            f"Draft a professional `{request.draft_type}` recruitment email in `{request.language}`.\n"
            "Interview / Outreach Parameters:\n"
            f"- Company Name: {request.company_name}\n"
            f"- Recruiter Name: {request.recruiter_name or 'Recruitment Team'}\n"
            f"- Interview Date: {request.interview_date or 'TBD'}\n"
            f"- Interview Time: {request.interview_time or 'TBD'}\n"
            f"- Duration: {request.duration_minutes} minutes\n"
            f"- Location: {request.location or bundle.job_location or 'TBD'}\n\n"
            "Grounding Rules:\n"
            "1. Mention ONLY candidate skills, roles, and experiences present in the retrieved evidence.\n"
            "2. Do NOT claim the candidate possesses any skill listed under `missing_skills`.\n"
            "3. Include `citations` mapping each referenced candidate/job fact to exact `source_id` strings.\n"
            "4. Format `body` as clean HTML (`<p>`, `<strong>`, `<br>`).\n"
            "5. Return ONLY valid JSON.\n\n"
            f"{bundle.render_prompt_context()}\n\n"
            f"JSON Schema:\n{json.dumps(schema, ensure_ascii=False, indent=2)}"
        )

    @staticmethod
    def _parse_summary_response(raw_response: str) -> dict[str, Any]:
        parsed = parse_json_payload(raw_response)
        if not isinstance(parsed, dict):
            raise ValueError(f"Expected JSON object, got {type(parsed)}")
        validated = _SummaryLLMResponse.model_validate(parsed)
        return validated.model_dump()

    @staticmethod
    def _parse_draft_response(raw_response: str) -> dict[str, Any]:
        parsed = parse_json_payload(raw_response)
        if not isinstance(parsed, dict):
            raise ValueError(f"Expected JSON object, got {type(parsed)}")
        validated = _DraftLLMResponse.model_validate(parsed)
        return validated.model_dump()

    @staticmethod
    def _build_extractive_summary_fallback(bundle: GroundedContextBundle) -> dict[str, Any]:
        cid = bundle.candidate_id
        evidence_ids = set(bundle.evidence_ids)
        role_desc = bundle.candidate_role or "Role unspecified"
        skills_preview = ", ".join(bundle.candidate_skills[:6]) or "No verified skills extracted"
        summary = (
            f"{bundle.candidate_name} ({role_desc}) has {bundle.candidate_experience_years:.1f} years "
            f"of documented experience with verified skills including {skills_preview}."
        )
        strengths: list[str] = []
        risks_or_gaps: list[str] = []
        citations: list[dict[str, Any]] = [
            {
                "claim": f"Candidate {bundle.candidate_name} has {bundle.candidate_experience_years:.1f} years of experience.",
                "evidence_ids": [f"cand:{cid}:profile"] if f"cand:{cid}:profile" in evidence_ids else [],
            }
        ]
        if bundle.candidate_skills and f"cand:{cid}:skills" in evidence_ids:
            strengths.append(f"Verified skills: {', '.join(bundle.candidate_skills[:6])}")
            citations.append(
                {
                    "claim": f"Verified candidate skills: {', '.join(bundle.candidate_skills[:6])}",
                    "evidence_ids": [f"cand:{cid}:skills"],
                }
            )

        next_step = "Proceed with recruiter screening."
        if bundle.match_signals and bundle.job_offer_id:
            sig = bundle.match_signals
            match_eid = f"match:{cid}:{bundle.job_offer_id}:signals"
            if sig.matched_skills:
                strengths.append(
                    f"Matches {len(sig.matched_skills)} required skills for {bundle.job_title}: {', '.join(sig.matched_skills[:5])}"
                )
            for gap in sig.gaps:
                risks_or_gaps.append(gap)
            if match_eid in evidence_ids:
                citations.append(
                    {
                        "claim": f"Hybrid match score for {bundle.job_title} is {sig.hybrid_score:.1f}%.",
                        "evidence_ids": [match_eid],
                    }
                )
            next_step = (
                "Invite for technical/HR interview."
                if sig.hybrid_score >= 60.0
                else "Hold or perform targeted screening on identified gaps."
            )

        return {
            "summary": summary,
            "strengths": strengths,
            "risks_or_gaps": risks_or_gaps,
            "recommended_next_step": next_step,
            "citations": citations,
        }

    @staticmethod
    def _build_extractive_email_fallback(
        bundle: GroundedContextBundle,
        request: GroundedDraftRequest,
    ) -> dict[str, Any]:
        cid = bundle.candidate_id
        evidence_ids = set(bundle.evidence_ids)
        job_title = bundle.job_title or "the open position"
        safe_name = html.escape(bundle.candidate_name)
        safe_job = html.escape(job_title)
        safe_company = html.escape(request.company_name)
        safe_recruiter = html.escape(request.recruiter_name or "Recruitment Team")

        highlight_skills = (
            bundle.match_signals.matched_skills[:4]
            if bundle.match_signals and bundle.match_signals.matched_skills
            else bundle.candidate_skills[:4]
        )
        skills_text = ", ".join(html.escape(s) for s in highlight_skills)

        is_fr = request.language.strip().casefold().startswith("fr")
        if is_fr:
            subject = f"Invitation à un entretien — {job_title} chez {request.company_name}"
            skill_line = (
                f"<p>Votre expérience ({bundle.candidate_experience_years:.1f} ans) et vos compétences en <strong>{skills_text}</strong> ont particulièrement retenu notre attention.</p>"
                if skills_text
                else f"<p>Votre profil ({bundle.candidate_experience_years:.1f} ans d'expérience) a retenu notre attention.</p>"
            )
            body = (
                f"<p>Bonjour {safe_name},</p>"
                f"<p>Nous avons le plaisir de vous convier à un entretien pour le poste de <strong>{safe_job}</strong> chez <strong>{safe_company}</strong>.</p>"
                f"{skill_line}"
                f"<p><strong>Date :</strong> {html.escape(request.interview_date or 'À confirmer')}<br>"
                f"<strong>Heure :</strong> {html.escape(request.interview_time or 'À confirmer')}<br>"
                f"<strong>Durée :</strong> {request.duration_minutes} minutes<br>"
                f"<strong>Lieu :</strong> {html.escape(request.location or bundle.job_location or 'À confirmer')}</p>"
                f"<p>Cordialement,<br>{safe_recruiter}<br>{safe_company}</p>"
            )
        else:
            subject = f"Interview Invitation — {job_title} at {request.company_name}"
            skill_line = (
                f"<p>Your {bundle.candidate_experience_years:.1f} years of experience and background in <strong>{skills_text}</strong> align well with our team's needs.</p>"
                if skills_text
                else f"<p>Your {bundle.candidate_experience_years:.1f} years of experience caught our attention.</p>"
            )
            body = (
                f"<p>Hello {safe_name},</p>"
                f"<p>We would like to invite you to an interview for the <strong>{safe_job}</strong> role at <strong>{safe_company}</strong>.</p>"
                f"{skill_line}"
                f"<p><strong>Date:</strong> {html.escape(request.interview_date or 'TBD')}<br>"
                f"<strong>Time:</strong> {html.escape(request.interview_time or 'TBD')}<br>"
                f"<strong>Duration:</strong> {request.duration_minutes} minutes<br>"
                f"<strong>Location:</strong> {html.escape(request.location or bundle.job_location or 'TBD')}</p>"
                f"<p>Best regards,<br>{safe_recruiter}<br>{safe_company}</p>"
            )

        citations: list[dict[str, Any]] = []
        if f"cand:{cid}:profile" in evidence_ids:
            citations.append(
                {
                    "claim": f"Candidate {bundle.candidate_name} has {bundle.candidate_experience_years:.1f} years of experience.",
                    "evidence_ids": [f"cand:{cid}:profile"],
                }
            )
        if highlight_skills and f"cand:{cid}:skills" in evidence_ids:
            citations.append(
                {
                    "claim": f"Candidate skills referenced: {', '.join(highlight_skills)}",
                    "evidence_ids": [f"cand:{cid}:skills"],
                }
            )
        if bundle.job_offer_id and f"job:{bundle.job_offer_id}:overview" in evidence_ids:
            citations.append(
                {
                    "claim": f"Job offer title: {job_title}",
                    "evidence_ids": [f"job:{bundle.job_offer_id}:overview"],
                }
            )

        return {
            "subject": subject,
            "body": body,
            "citations": citations,
        }
