from typing import Literal

from pydantic import BaseModel, Field


class InfrastructureAdvisorRequest(BaseModel):
    ai_provider: Literal["ollama", "gemini"] = "ollama"
    request: str = Field(
        min_length=10,
        max_length=4000,
        description=("Natural language description of the infrastructure requirement."),
    )

    provider_preference: str | None = Field(
        default=None,
        max_length=32,
    )

    max_monthly_budget_usd: float | None = Field(
        default=None,
        gt=0,
    )

    environment: str = Field(
        default="dev",
        pattern=r"^(dev|test|prod)$",
    )


class InfrastructureRecommendation(BaseModel):
    provider: str = Field(
        min_length=1,
        max_length=32,
    )

    region: str = Field(
        min_length=1,
        max_length=64,
    )

    environment: str = Field(
        pattern=r"^(dev|test|prod)$",
    )

    instance_count: int = Field(
        ge=1,
        le=100,
    )

    instance_type: str = Field(
        min_length=1,
        max_length=64,
    )

    disk_type: str = Field(
        min_length=1,
        max_length=32,
    )

    disk_size_gb: int = Field(
        ge=1,
        le=4096,
    )

    public_ip: bool

    architecture_summary: str = Field(
        min_length=1,
        max_length=1500,
    )

    reason: str = Field(
        min_length=1,
        max_length=3000,
    )

    assumptions: list[str] = Field(
        default_factory=list,
        max_length=10,
    )

    risks: list[str] = Field(
        default_factory=list,
        max_length=10,
    )

    confidence: float = Field(
        ge=0,
        le=1,
    )


class InfrastructureAdvisorResponse(BaseModel):
    recommendation: InfrastructureRecommendation

    estimated_monthly_cost_usd: float | None = None

    pricing_status: str = "not_configured"

    ai_provider: str

    ai_model: str

    executable: bool = False


class AIHealthResponse(BaseModel):
    provider: str
    model: str
    available: bool
