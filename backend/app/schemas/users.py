import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(max_length=255)
    full_name: str = Field(min_length=1, max_length=150)
    role_id: uuid.UUID
    is_active: bool = True

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name must not be blank.")
        return value


class UserCreate(UserFields):
    password: str = Field(min_length=12, max_length=128, repr=False)


class UserUpdate(UserFields):
    pass


class RoleResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    permissions: list[str]


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    role_id: uuid.UUID
    role_code: str
    role_name: str
    created_at: datetime


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
