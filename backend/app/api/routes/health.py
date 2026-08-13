from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]


@router.get(
    "",
    response_model=HealthResponse,
    status_code=200,
)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
