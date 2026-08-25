import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    correlation_id: uuid.UUID
    operation_id: uuid.UUID | None
    user_id: uuid.UUID | None
    resource_id: uuid.UUID | None
    provider: str
    action: str
    decision: str
    reason_code: str
    required_permission: str
    role_code: str | None
    event_type: str
    http_method: str | None
    request_path: str | None
    details: dict[str, Any] | None
    created_at: datetime