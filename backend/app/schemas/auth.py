import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginChallengeResponse(BaseModel):
    mfa_required: Literal[True] = True
    challenge_id: uuid.UUID
    email_hint: str
    expires_in_seconds: int
    resend_available_in_seconds: int


class VerifyLoginCodeRequest(BaseModel):
    challenge_id: uuid.UUID
    code: str = Field(pattern=r"^\d{6}$", repr=False)


class ResendLoginCodeRequest(BaseModel):
    challenge_id: uuid.UUID


class TokenPayload(BaseModel):
    sub: str


class SetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    password: str = Field(min_length=12, max_length=128, repr=False)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    detail: str


class PasswordSetupTokenInfo(BaseModel):
    email: EmailStr
    full_name: str


class CloudAccessResponse(BaseModel):
    role_code: str
    role_name: str
    # Only the vm.* permissions: the ones a cloud role actually grants.
    permissions: list[str]


class CurrentUserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role_code: str
    role_name: str
    permissions: list[str]
    # Per-cloud VM access; null when the user has no access to that cloud.
    cloud_access: dict[Literal["azure", "aws"], CloudAccessResponse | None]
