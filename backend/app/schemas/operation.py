import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class OperationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    correlation_id: uuid.UUID
    user_id: uuid.UUID | None
    resource_id: uuid.UUID | None
    provider: str
    action: str
    required_permission: str
    status: str
    result_summary: dict[str, Any] | None
    error_code: str | None
    error_message: str | None
    requested_at: datetime
    completed_at: datetime | None