from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import LoginChallenge, Role, User
from app.schemas.auth import (
    CurrentUserResponse,
    LoginChallengeResponse,
    LoginRequest,
    PasswordSetupTokenInfo,
    ResendLoginCodeRequest,
    SetPasswordRequest,
    TokenResponse,
    VerifyLoginCodeRequest,
)
from app.services.email import EmailDeliveryError
from app.services.login_mfa import (
    ResendNotAllowedError,
    mask_email,
    reissue_login_code,
    send_login_code_email,
    start_login_challenge,
    verify_login_challenge,
)
from app.services.password_setup import (
    peek_password_setup_token,
    redeem_password_setup_token,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


_INVALID_CODE = "El código no es válido o ya expiró."
_CODE_NOT_SENT = "No se pudo enviar el código de verificación. Inténtalo de nuevo."


def _challenge_response(
    challenge: LoginChallenge, user: User
) -> LoginChallengeResponse:
    return LoginChallengeResponse(
        challenge_id=challenge.id,
        email_hint=mask_email(user.email),
        expires_in_seconds=settings.login_code_expire_minutes * 60,
        resend_available_in_seconds=settings.login_code_resend_cooldown_seconds,
    )


def _send_code(user: User, code: str) -> None:
    try:
        send_login_code_email(user, code)
    except EmailDeliveryError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, _CODE_NOT_SENT) from exc


@router.post(
    "/login",
    response_model=TokenResponse | LoginChallengeResponse,
    status_code=status.HTTP_200_OK,
)
def login(
    credentials: LoginRequest,
    db: DatabaseSession,
) -> TokenResponse | LoginChallengeResponse:
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

    if settings.mfa_enabled:
        challenge, code = start_login_challenge(db, user)
        db.commit()
        _send_code(user, code)
        return _challenge_response(challenge, user)

    token = create_access_token(subject=str(user.id))

    return TokenResponse(
        access_token=token,
        token_type="bearer",
    )


@router.post(
    "/login/verify",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
def verify_login_code(
    payload: VerifyLoginCodeRequest,
    db: DatabaseSession,
) -> TokenResponse:
    user = verify_login_challenge(db, payload.challenge_id, payload.code)
    # Commit either way: a failed guess must still count as an attempt.
    db.commit()

    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _INVALID_CODE)

    return TokenResponse(
        access_token=create_access_token(subject=str(user.id)),
        token_type="bearer",
    )


@router.post(
    "/login/resend",
    response_model=LoginChallengeResponse,
    status_code=status.HTTP_200_OK,
)
def resend_login_code(
    payload: ResendLoginCodeRequest,
    db: DatabaseSession,
) -> LoginChallengeResponse:
    try:
        reissued = reissue_login_code(db, payload.challenge_id)
    except ResendNotAllowedError as exc:
        db.commit()  # nothing changed; releases the row lock
        if exc.retry_after is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Ya no se pueden enviar más códigos. Inicia sesión de nuevo.",
            ) from exc
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Espera unos segundos antes de pedir otro código.",
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc

    if reissued is None:
        db.commit()  # nothing changed; releases the row lock
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _INVALID_CODE)

    challenge, user, code = reissued
    db.commit()
    _send_code(user, code)
    return _challenge_response(challenge, user)


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
