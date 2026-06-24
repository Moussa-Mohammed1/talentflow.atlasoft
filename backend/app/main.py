from fastapi import FastAPI, Request

from app.api.router import api_router
from app.api.routes.notification import websocket_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="TalentFlow API")

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
	print(f"=== REQUEST RECEIVED === {request.method} {request.url.path}", flush=True)
	response = await call_next(request)
	return response

app.include_router(api_router, prefix="/api")
app.include_router(websocket_router)
