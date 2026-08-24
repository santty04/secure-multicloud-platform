from app.api.routes.auth import router as auth_router
from app.api.routes.instances import router as instances_router

__all__ = [
    "auth_router",
    "instances_router",
]
