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

api_router = APIRouter()

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
