from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]


app = FastAPI(
    title="Secure Multicloud Platform API",
    description="Backend API for secure multicloud infrastructure management.",
    version="0.1.0",
)


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=200,
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
