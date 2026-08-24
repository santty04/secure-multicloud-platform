import uuid
from enum import StrEnum

from pydantic import BaseModel


class CloudProvider(StrEnum):
    AZURE = "azure"
    AWS = "aws"


class InstanceActionResponse(BaseModel):
    resource_id: uuid.UUID
    provider: CloudProvider
    action: str
    status: str
    requested_by: uuid.UUID


class InstanceSummary(BaseModel):
    id: uuid.UUID
    name: str
    provider: CloudProvider
    status: str
