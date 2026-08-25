import uuid
from enum import StrEnum

from pydantic import BaseModel, ConfigDict


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
    resource_type: str
    region: str
    environment: str
    status: str
    is_managed: bool

    model_config = ConfigDict(from_attributes=True)


class InstanceStatusResponse(BaseModel):
    resource_id: uuid.UUID
    provider: CloudProvider
    name: str
    status: str


class AWSInstanceSummary(BaseModel):
    instance_id: str
    name: str
    state: str
    instance_type: str
    private_ip: str | None
    provider: str
    region: str
