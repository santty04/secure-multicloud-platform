from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class CloudProvider(StrEnum):
    AZURE = "azure"
    AWS = "aws"


class InstanceValidationRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    provider: CloudProvider
    name: str = Field(
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9][a-zA-Z0-9-]*$",
    )
    region: str = Field(min_length=2, max_length=50)
    size: str = Field(min_length=2, max_length=50)


class InstanceValidationResponse(BaseModel):
    valid: bool
    provider: CloudProvider
    name: str
    region: str
    size: str
