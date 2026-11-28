from __future__ import annotations

import re
import time
from typing import Any, Literal, TypedDict

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from app.schemas.job_offers import JobOfferCreate, JobOfferRead
from app.schemas.workflows import (
    JobOfferIntakeWorkflowRequest,
    JobOfferIntakeWorkflowResponse,
    WorkflowStepTrace,
)
from app.services.LLM.validate_job_offers import LLMService as JobOfferLLMService
from app.services.cv_pipeline.normalizer import CVAttributeNormalizer
from app.services.job_offers_service import JobOffersService
from app.services.llm_observability import observe_span, record_langfuse_score
from app.services.llm_router import LLMRouterError, LLMRouterService
from app.services.matching.hybrid_matcher import HybridMatchingService
from app.services.workflows.tools import RecruitmentToolset


class JobIntakeWorkflowState(TypedDict, total=False):
    raw_description: str
    department_name: str | None
    persist: bool

    cleaned_description: str
    parsed_offer: dict[str, Any]
    extracted_skills: list[str]
    resolved_department_id: int | None
    persisted_offer: JobOfferRead | None
    validation_passed: bool
    validation_warnings: list[str]
    fallback_used: bool
    step_history: list[WorkflowStepTrace]


class JobIntakeWorkflowRunner:
    """Explicit LangGraph state machine for job offer intake -> structuring -> validation -> persistence."""

    def __init__(self, db: Session, *, recruiter_id: int | None = None) -> None:
        self.db = db
        self.recruiter_id = recruiter_id
        self.tools = RecruitmentToolset(db, recruiter_id=recruiter_id)
        self.normalizer = CVAttributeNormalizer()
        self.graph = self._compile_graph()

    def _compile_graph(self):
        builder = StateGraph(JobIntakeWorkflowState)
        builder.add_node("intake_normalize", self._node_intake_normalize)
        builder.add_node("llm_structure_offer", self._node_llm_structure_offer)
        builder.add_node("deterministic_offer_fallback", self._node_deterministic_fallback)
        builder.add_node("validate_and_enrich", self._node_validate_and_enrich)
        builder.add_node("persist_and_index", self._node_persist_and_index)

        builder.add_edge(START, "intake_normalize")
        builder.add_edge("intake_normalize", "llm_structure_offer")
        builder.add_conditional_edges(
            "llm_structure_offer",
            self._route_after_llm,
            {
                "ok": "validate_and_enrich",
                "fallback": "deterministic_offer_fallback",
            },
        )
        builder.add_edge("deterministic_offer_fallback", "validate_and_enrich")
        builder.add_conditional_edges(
            "validate_and_enrich",
            self._route_after_validation,
            {
                "persist": "persist_and_index",
                "skip": END,
            },
        )
        builder.add_edge("persist_and_index", END)
        return builder.compile()

    def get_mermaid_diagram(self) -> str:
        return self.graph.get_graph().draw_mermaid()

    def get_node_names(self) -> list[str]:
        return [
            "intake_normalize",
            "llm_structure_offer",
            "deterministic_offer_fallback",
            "validate_and_enrich",
            "persist_and_index",
        ]

    def _node_intake_normalize(self, state: JobIntakeWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        cleaned = re.sub(r"[ \t]+", " ", state["raw_description"]).strip()
        history.append(
            WorkflowStepTrace(
                node="intake_normalize",
                status="completed",
                duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                details={"char_count": len(cleaned)},
            )
        )
        return {"cleaned_description": cleaned, "step_history": history}

    def _node_llm_structure_offer(self, state: JobIntakeWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        desc = state["cleaned_description"]

        if not LLMRouterService.is_task_configured("job_offer_drafting", db=self.db):
            history.append(
                WorkflowStepTrace(
                    node="llm_structure_offer",
                    status="fallback",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={"reason": "provider_unconfigured"},
                )
            )
            return {"parsed_offer": {}, "fallback_used": True, "step_history": history}

        try:
            parsed = JobOfferLLMService.validate(desc, db=self.db, recruiter_id=self.recruiter_id)
            history.append(
                WorkflowStepTrace(
                    node="llm_structure_offer",
                    status="completed",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={"title": parsed.get("title")},
                )
            )
            return {"parsed_offer": parsed, "fallback_used": False, "step_history": history}
        except (LLMRouterError, Exception) as exc:
            history.append(
                WorkflowStepTrace(
                    node="llm_structure_offer",
                    status="fallback",
                    duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                    details={"reason": f"{type(exc).__name__}: {exc}"[:200]},
                )
            )
            return {"parsed_offer": {}, "fallback_used": True, "step_history": history}

    def _node_deterministic_fallback(self, state: JobIntakeWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        desc = state["cleaned_description"]
        lines = [line.strip() for line in desc.splitlines() if line.strip()]
        inferred_title = lines[0][:120] if lines else "Untitled Position"

        lowered = desc.casefold()
        work_mode = "remote" if "remote" in lowered or "télétravail" in lowered else (
            "hybrid" if "hybrid" in lowered or "hybride" in lowered else "on_site"
        )
        seniority = "senior" if "senior" in lowered else (
            "lead" if "lead" in lowered else ("junior" if "junior" in lowered else "mid")
        )
        parsed = {
            "title": inferred_title,
            "description": desc,
            "responsibilities": None,
            "department_name": state.get("department_name"),
            "employment_type": "full_time",
            "work_mode": work_mode,
            "seniority_level": seniority,
            "openings": 1,
        }
        history.append(
            WorkflowStepTrace(
                node="deterministic_offer_fallback",
                status="fallback",
                duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                details={"title": inferred_title, "work_mode": work_mode, "seniority": seniority},
            )
        )
        return {"parsed_offer": parsed, "fallback_used": True, "step_history": history}

    def _node_validate_and_enrich(self, state: JobIntakeWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        parsed = dict(state.get("parsed_offer") or {})
        warnings: list[str] = []

        dept_name = state.get("department_name") or parsed.get("department_name")
        dept_id = self.tools.resolve_department_id(dept_name)
        if dept_name and dept_id is None:
            warnings.append(f"Department '{dept_name}' not found; leaving department_id null.")

        extracted_skills = HybridMatchingService(
            self.db, normalizer=self.normalizer
        )._extract_skills_from_text(
            f"{parsed.get('title', '')}\n{parsed.get('description', '')}\n{state['cleaned_description']}"
        )

        # Validate via Pydantic schema
        JobOfferCreate(
            title=str(parsed.get("title") or "Untitled Position").strip(),
            description=str(parsed.get("description") or "").strip() or None,
            responsibilities=str(parsed.get("responsibilities") or "").strip() or None,
            department_id=dept_id,
            employment_type=parsed.get("employment_type", "full_time"),
            work_mode=parsed.get("work_mode", "on_site"),
            seniority_level=parsed.get("seniority_level", "mid"),
            openings=int(parsed.get("openings", 1)),
        )

        history.append(
            WorkflowStepTrace(
                node="validate_and_enrich",
                status="completed",
                duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                details={"extracted_skills_count": len(extracted_skills), "department_id": dept_id},
            )
        )
        return {
            "extracted_skills": extracted_skills,
            "resolved_department_id": dept_id,
            "validation_passed": True,
            "validation_warnings": warnings,
            "step_history": history,
        }

    def _node_persist_and_index(self, state: JobIntakeWorkflowState) -> dict[str, Any]:
        started = time.perf_counter()
        history = list(state.get("step_history") or [])
        parsed = state["parsed_offer"]
        job_in = JobOfferCreate(
            title=str(parsed.get("title") or "Untitled Position").strip(),
            description=str(parsed.get("description") or "").strip() or None,
            responsibilities=str(parsed.get("responsibilities") or "").strip() or None,
            department_id=state.get("resolved_department_id"),
            employment_type=parsed.get("employment_type", "full_time"),
            work_mode=parsed.get("work_mode", "on_site"),
            seniority_level=parsed.get("seniority_level", "mid"),
            openings=int(parsed.get("openings", 1)),
        )
        persisted = JobOffersService(self.db).create(job_in)
        history.append(
            WorkflowStepTrace(
                node="persist_and_index",
                status="completed",
                duration_ms=max(1, int((time.perf_counter() - started) * 1000)),
                details={"job_offer_id": str(persisted.id)},
            )
        )
        return {"persisted_offer": persisted, "step_history": history}

    @staticmethod
    def _route_after_llm(state: JobIntakeWorkflowState) -> str:
        return "ok" if state.get("parsed_offer") and not state.get("fallback_used") else "fallback"

    @staticmethod
    def _route_after_validation(state: JobIntakeWorkflowState) -> str:
        return "persist" if state.get("persist", True) and state.get("validation_passed") else "skip"

    def run(self, request: JobOfferIntakeWorkflowRequest) -> JobOfferIntakeWorkflowResponse:
        with observe_span(
            "workflow.job_offer_intake",
            as_type="chain",
            user_id=self.recruiter_id,
            input_data=request.model_dump(mode="json"),
            tags=["langgraph", "job_offer_intake"],
        ) as span:
            final_state = self.graph.invoke(
                {
                    "raw_description": request.raw_description,
                    "department_name": request.department_name,
                    "persist": request.persist,
                    "fallback_used": False,
                    "step_history": [],
                }
            )
            status_label: Literal["completed", "completed_with_fallback", "failed"] = (
                "completed_with_fallback" if final_state.get("fallback_used") else "completed"
            )
            record_langfuse_score(
                name="job_intake_validation_passed",
                value=1.0 if final_state.get("validation_passed") else 0.0,
                trace_id=span.trace_id,
            )
            response = JobOfferIntakeWorkflowResponse(
                trace_id=span.trace_id,
                status=status_label,
                parsed_offer=final_state.get("parsed_offer", {}),
                extracted_skills=final_state.get("extracted_skills", []),
                resolved_department_id=final_state.get("resolved_department_id"),
                persisted_offer=final_state.get("persisted_offer"),
                validation_passed=bool(final_state.get("validation_passed", False)),
                validation_warnings=final_state.get("validation_warnings", []),
                fallback_used=bool(final_state.get("fallback_used", False)),
                step_history=final_state.get("step_history", []),
            )
            span.set_output({"status": response.status, "title": response.parsed_offer.get("title")})
            return response
