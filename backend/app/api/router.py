from fastapi import APIRouter

from app.api.routes.resume import router as resume_router
from app.api.routes.auth import router as auth_router
from app.api.routes.notification import router as notification_router
from app.api.routes.job import router as job_router
from app.api.routes.settings import router as settings_router
from app.api.routes.department import router as department_router
from app.api.routes.activity import router as activity_router
from app.api.routes.evaluate import router as evaluate_router
from app.api.routes.job_offers import router as job_offers_router
from app.api.routes.recruitment import router as recruitment_router
from app.api.routes.admin import router as admin_router
from app.api.routes.admin_llm import router as admin_llm_router
from app.api.routes.files import router as files_router
from app.api.routes.health import router as health_router
from app.api.routes.matching import router as matching_router
from app.api.routes.rag import router as rag_router
from app.api.routes.workflows import router as workflows_router
from app.api.routes.observability import router as observability_router

api_router = APIRouter()
@api_router.get("/", tags=["API"])
async def root():
    return {
        "message":  "Welcome to the TalentFlow API",
        "status" : "online",
    }
api_router.include_router(health_router)
api_router.include_router(files_router)
api_router.include_router(resume_router)
api_router.include_router(auth_router)
api_router.include_router(notification_router)
api_router.include_router(job_router)
api_router.include_router(settings_router)
api_router.include_router(department_router)
api_router.include_router(activity_router)
api_router.include_router(evaluate_router)
api_router.include_router(job_offers_router)
api_router.include_router(recruitment_router)
api_router.include_router(admin_router)
api_router.include_router(admin_llm_router)
api_router.include_router(matching_router)
api_router.include_router(rag_router)
api_router.include_router(workflows_router)
api_router.include_router(observability_router)
