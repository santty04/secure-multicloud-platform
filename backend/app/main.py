from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.request_context import add_correlation_id
from app.api.routes import auth_router

from app.api.routes import auth_router, instances_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Backend API for secure multicloud infrastructure management.",
    version=settings.app_version,
    debug=settings.debug,
)

app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    instances_router,
    prefix="/api/v1",
)

app.middleware("http")(add_correlation_id)
register_exception_handlers(app)
app.include_router(api_router)
