from fastapi import APIRouter

from app.api.routes.resume import router as resume_router
from app.api.routes.auth import router as auth_router

api_router = APIRouter()

api_router.include_router(resume_router)
api_router.include_router(auth_router)
