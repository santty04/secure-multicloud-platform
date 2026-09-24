import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuthEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_type: str
    email: str
    user_id: uuid.UUID | None
    correlation_id: uuid.UUID | None
    ip_address: str | None
    user_agent: str | None
    details: dict[str, Any] | None
    created_at: datetime


class AuthEventPage(BaseModel):
    items: list[AuthEventResponse]
    total: int
