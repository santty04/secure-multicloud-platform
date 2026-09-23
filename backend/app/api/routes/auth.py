from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import Role, User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    PasswordSetupTokenInfo,
    SetPasswordRequest,
    TokenResponse,
)
from app.services.password_setup import (
    peek_password_setup_token,
    redeem_password_setup_token,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
def login(
    credentials: LoginRequest,
    db: DatabaseSession,
) -> TokenResponse:
    normalized_email = str(credentials.email).strip().lower()

    statement = select(User).where(User.email == normalized_email)
    user = db.scalar(statement)

    if user is None or not verify_password(
        credentials.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=str(user.id))

    return TokenResponse(
        access_token=token,
        token_type="bearer",
    )


@router.get(
    "/set-password/{token}",
    response_model=PasswordSetupTokenInfo,
    status_code=status.HTTP_200_OK,
)
def read_password_setup_token(
    token: str,
    db: DatabaseSession,
) -> PasswordSetupTokenInfo:
    user = peek_password_setup_token(db, token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace no es válido o ya expiró.",
        )

    return PasswordSetupTokenInfo(email=user.email, full_name=user.full_name)


@router.post(
    "/set-password",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
def set_password(
    payload: SetPasswordRequest,
    db: DatabaseSession,
) -> TokenResponse:
    user = redeem_password_setup_token(db, payload.token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace no es válido o ya expiró.",
        )

    user.password_hash = hash_password(payload.password)
    db.commit()

    token = create_access_token(subject=str(user.id))

    return TokenResponse(
        access_token=token,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
)
def read_current_user(
    current_user: CurrentUser,
    db: DatabaseSession,
) -> CurrentUserResponse:
    statement = (
        select(User)
        .options(joinedload(User.role).joinedload(Role.permissions))
        .where(User.id == current_user.id)
    )

    user = db.execute(statement).unique().scalar_one()

    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        role_code=user.role.code,
        role_name=user.role.name,
        permissions=sorted(permission.code for permission in user.role.permissions),
    )
