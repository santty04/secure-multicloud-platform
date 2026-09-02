from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_v1_router, root_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.request_context import add_correlation_id

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Backend API for secure multicloud infrastructure management.",
    version=settings.app_version,
    debug=settings.debug,
)

if settings.cors_allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.middleware("http")(add_correlation_id)

register_exception_handlers(app)

app.include_router(root_router)

app.include_router(
    api_v1_router,
    prefix="/api/v1",
)
