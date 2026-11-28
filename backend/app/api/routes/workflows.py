from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.job import JobType
from app.models.user import User
from app.schemas.job import JobAcceptedResponse
from app.schemas.workflows import (
    CandidateRecruitmentWorkflowRequest,
    CandidateRecruitmentWorkflowResponse,
    JobOfferIntakeWorkflowRequest,
    JobOfferIntakeWorkflowResponse,
    WorkflowGraphDescriptor,
)
from app.services.workflows.job_intake_graph import JobIntakeWorkflowRunner
from app.services.workflows.recruitment_graph import RecruitmentWorkflowRunner
from app.workers.celery_app import QUEUE_AI_WORKFLOWS
from app.workers.dispatcher import dispatch_background_job
from app.workers.tasks import execute_recruitment_workflow_job

router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.get("/graphs", response_model=list[WorkflowGraphDescriptor])
def list_workflow_graphs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkflowGraphDescriptor]:
    rec_runner = RecruitmentWorkflowRunner(db, recruiter_id=current_user.id)
    job_runner = JobIntakeWorkflowRunner(db, recruiter_id=current_user.id)
    return [
        WorkflowGraphDescriptor(
            name="recruitment_pipeline",
            description="LangGraph state machine: intake -> grounded retrieval -> structured evaluation -> conditional drafting -> grounding validation & bounded fallback.",
            nodes=rec_runner.get_node_names(),
            mermaid=rec_runner.get_mermaid_diagram(),
        ),
        WorkflowGraphDescriptor(
            name="job_offer_intake",
            description="LangGraph state machine: intake normalization -> LLM structuring / deterministic fallback -> validation & ontology skill enrichment -> persistence & pgvector indexing.",
            nodes=job_runner.get_node_names(),
            mermaid=job_runner.get_mermaid_diagram(),
        ),
    ]


@router.post("/recruitment-pipeline", response_model=CandidateRecruitmentWorkflowResponse)
def run_recruitment_workflow(
    payload: CandidateRecruitmentWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CandidateRecruitmentWorkflowResponse:
    runner = RecruitmentWorkflowRunner(db, recruiter_id=current_user.id)
    return runner.run(payload)


@router.post(
    "/recruitment-pipeline/async",
    response_model=JobAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def run_recruitment_workflow_async(
    payload: CandidateRecruitmentWorkflowRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobAcceptedResponse:
    return dispatch_background_job(
        db,
        background_tasks,
        recruiter_id=current_user.id,
        job_type=JobType.CANDIDATE_MATCHING,
        target=f"workflow:candidate#{payload.candidate_id}",
        task_name="talentflow.ai.run_recruitment_workflow",
        queue_name=QUEUE_AI_WORKFLOWS,
        task_kwargs={"request_payload": payload.model_dump(mode="json")},
        fallback_fn=execute_recruitment_workflow_job,
        initial_message="LangGraph recruitment workflow queued",
    )


@router.post("/job-offer-intake", response_model=JobOfferIntakeWorkflowResponse)
def run_job_offer_intake_workflow(
    payload: JobOfferIntakeWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobOfferIntakeWorkflowResponse:
    runner = JobIntakeWorkflowRunner(db, recruiter_id=current_user.id)
    return runner.run(payload)
