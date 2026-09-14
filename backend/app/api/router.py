from fastapi import APIRouter

from app.api.routes.ai import router as ai_router
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.instances import router as instances_router
from app.api.routes.operations import router as operations_router
from app.api.routes.validation import router as validation_router

# ============================================================
# ROOT ROUTES
# ============================================================

root_router = APIRouter()

root_router.include_router(health_router)
root_router.include_router(validation_router)

# ============================================================
# API V1 ROUTES
# ============================================================

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(instances_router)
api_v1_router.include_router(operations_router)
api_v1_router.include_router(ai_router)
