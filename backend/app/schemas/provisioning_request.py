import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ProvisioningRequestStatus = Literal[
    "pending",
    "approved",
    "rejected",
    "executing",
    "executed",
    "failed",
]


class ProvisioningRequestReviewRequest(BaseModel):
    note: str | None = Field(
        default=None,
        max_length=1000,
    )


class ProvisioningRequestResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: uuid.UUID
    correlation_id: uuid.UUID

    status: ProvisioningRequestStatus

    created_by_id: uuid.UUID | None
    created_by_email: str

    reviewed_by_id: uuid.UUID | None
    reviewed_by_email: str | None

    original_request: str
    requested_name: str | None

    provider_preference: str | None
    max_monthly_budget_usd: float | None

    provider: str
    region: str
    environment: str

    instance_count: int
    instance_type: str

    disk_type: str
    disk_size_gb: int

    public_ip: bool

    architecture_summary: str
    reason: str

    assumptions: list[str]
    risks: list[str]

    confidence: float

    estimated_monthly_cost_usd: float | None
    pricing_status: str

    ai_provider: str
    ai_model: str

    review_note: str | None

    managed_resource_id: uuid.UUID | None
    operation_id: uuid.UUID | None

    failure_reason: str | None

    created_at: datetime
    updated_at: datetime

    approved_at: datetime | None
    rejected_at: datetime | None

    execution_started_at: datetime | None
    executed_at: datetime | None
