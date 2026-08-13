from fastapi import FastAPI

from app.api.router import api_router
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

app.middleware("http")(add_correlation_id)
register_exception_handlers(app)
app.include_router(api_router)
