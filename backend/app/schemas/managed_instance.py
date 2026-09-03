import uuid
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


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


class AWSInstanceCreateRequest(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9._-]+$",
    )


class AWSInstanceCreateResponse(BaseModel):
    resource_id: uuid.UUID
    cloud_resource_id: str
    provider: CloudProvider
    name: str
    status: str
    requested_by: uuid.UUID

class AzureInstanceCreateRequest(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9-]+$",
    )

    size: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
    )

    location: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
    )

    admin_username: str = Field(
        default="azureadmin",
        min_length=1,
        max_length=32,
        pattern=r"^[A-Za-z][A-Za-z0-9_-]*$",
    )

    ssh_public_key: str = Field(
        min_length=20,
        max_length=4096,
    )


class AzureInstanceCreateResponse(BaseModel):
    resource_id: uuid.UUID
    cloud_resource_id: str
    provider: CloudProvider
    name: str
    status: str
    requested_by: uuid.UUID