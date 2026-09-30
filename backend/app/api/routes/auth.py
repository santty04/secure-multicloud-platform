import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.dependencies import CurrentUser, DatabaseSession
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import LoginChallenge, Role, User
from app.schemas.auth import (
    CloudAccessResponse,
    CurrentUserResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginChallengeResponse,
    LoginRequest,
    PasswordSetupTokenInfo,
    ResendLoginCodeRequest,
    SetPasswordRequest,
    TokenResponse,
    VerifyLoginCodeRequest,
)
from app.services.auth_events import (
    CHALLENGE_LOCKED,
    CODE_FAILED,
    CODE_RESENT,
    CODE_SENT,
    LOGIN_SUCCEEDED,
    LOGIN_THROTTLED,
    PASSWORD_FAILED,
    PASSWORD_RESET_REQUESTED,
    PASSWORD_RESET_THROTTLED,
    PASSWORD_SET,
    lock_account_attempts,
    login_retry_after,
    password_reset_allowed,
    record_auth_event,
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
    issue_password_reset_token,
    peek_password_setup_token,
    redeem_password_setup_token,
    send_password_reset_email,
)

logger = logging.getLogger(__name__)

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


def _throttled(retry_after: int) -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
        headers={"Retry-After": str(retry_after)},
    )


def _invalid_credentials() -> HTTPException:
    # Same answer for unknown, wrong and inactive accounts: no enumeration.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post(
    "/login",
    response_model=TokenResponse | LoginChallengeResponse,
    status_code=status.HTTP_200_OK,
)
def login(
    credentials: LoginRequest,
    request: Request,
    db: DatabaseSession,
) -> TokenResponse | LoginChallengeResponse:
    normalized_email = str(credentials.email).strip().lower()

    # Throttle by the typed address, whether or not an account exists, so the
    # response does not reveal which emails are registered.
    lock_account_attempts(db, normalized_email)
    retry_after = login_retry_after(db, normalized_email)
    if retry_after is not None:
        record_auth_event(db, request, LOGIN_THROTTLED, email=normalized_email)
        db.commit()
        raise _throttled(retry_after)

    user = db.scalar(select(User).where(User.email == normalized_email))

    if user is None:
        failure = "unknown_account"
    elif not verify_password(credentials.password, user.password_hash):
        failure = "wrong_password"
    elif not user.is_active:
        failure = "inactive_account"
    else:
        failure = None

    if failure is not None:
        record_auth_event(
            db,
            request,
            PASSWORD_FAILED,
            email=normalized_email,
            user=user,
            details={"reason": failure},
        )
        db.commit()
        raise _invalid_credentials()

    if settings.mfa_enabled:
        challenge, code = start_login_challenge(db, user)
        record_auth_event(
            db,
            request,
            CODE_SENT,
            email=normalized_email,
            user=user,
            details={"challenge_id": str(challenge.id)},
        )
        db.commit()
        _send_code(user, code)
        return _challenge_response(challenge, user)

    record_auth_event(
        db,
        request,
        LOGIN_SUCCEEDED,
        email=normalized_email,
        user=user,
        details={"mfa": False},
    )
    db.commit()

    return TokenResponse(
        access_token=create_access_token(subject=str(user.id)),
        token_type="bearer",
    )


@router.post(
    "/login/verify",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
)
def verify_login_code(
    payload: VerifyLoginCodeRequest,
    request: Request,
    db: DatabaseSession,
) -> TokenResponse:
    check = verify_login_challenge(db, payload.challenge_id, payload.code)
    details = {"challenge_id": str(payload.challenge_id)}

    if check.user is not None and not check.accepted:
        record_auth_event(
            db,
            request,
            CODE_FAILED,
            email=check.user.email,
            user=check.user,
            details=details,
        )
        if check.locked:
            record_auth_event(
                db,
                request,
                CHALLENGE_LOCKED,
                email=check.user.email,
                user=check.user,
                details=details,
            )
    elif check.accepted:
        record_auth_event(
            db,
            request,
            LOGIN_SUCCEEDED,
            email=check.user.email,
            user=check.user,
            details={**details, "mfa": True},
        )

    # Commit either way: a failed guess must still count as an attempt.
    db.commit()

    if not check.accepted:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _INVALID_CODE)

    return TokenResponse(
        access_token=create_access_token(subject=str(check.user.id)),
        token_type="bearer",
    )


@router.post(
    "/login/resend",
    response_model=LoginChallengeResponse,
    status_code=status.HTTP_200_OK,
)
def resend_login_code(
    payload: ResendLoginCodeRequest,
    request: Request,
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
    record_auth_event(
        db,
        request,
        CODE_RESENT,
        email=user.email,
        user=user,
        details={"challenge_id": str(challenge.id), "sends": challenge.sends},
    )
    db.commit()
    _send_code(user, code)
    return _challenge_response(challenge, user)


_RESET_ACCEPTED = (
    "Si el correo corresponde a una cuenta activa, recibirás un enlace para "
    "restablecer tu contraseña en unos minutos."
)


def _deliver_reset_email(user: User, token: str) -> None:
    # Runs after the response is sent, so a failure can only be logged: the
    # caller already got the same answer every address gets.
    try:
        send_password_reset_email(user, token)
    except EmailDeliveryError:
        logger.exception("Password reset email to user %s was not delivered.", user.id)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: DatabaseSession,
) -> ForgotPasswordResponse:
    normalized_email = str(payload.email).strip().lower()

    # Same answer, and roughly the same timing (the email goes out in the
    # background), whether or not the account exists: no enumeration.
    lock_account_attempts(db, normalized_email)
    if not password_reset_allowed(db, normalized_email):
        record_auth_event(db, request, PASSWORD_RESET_THROTTLED, email=normalized_email)
        db.commit()
        return ForgotPasswordResponse(detail=_RESET_ACCEPTED)

    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None:
        reason = "unknown_account"
    elif not user.is_active:
        reason = "inactive_account"
    else:
        reason = None

    record_auth_event(
        db,
        request,
        PASSWORD_RESET_REQUESTED,
        email=normalized_email,
        user=user,
        details={"reason": reason} if reason else None,
    )

    if reason is None:
        token = issue_password_reset_token(db, user)
        db.commit()
        background_tasks.add_task(_deliver_reset_email, user, token)
    else:
        db.commit()

    return ForgotPasswordResponse(detail=_RESET_ACCEPTED)


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
    request: Request,
    db: DatabaseSession,
) -> TokenResponse:
    user = redeem_password_setup_token(db, payload.token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace no es válido o ya expiró.",
        )

    user.password_hash = hash_password(payload.password)
    record_auth_event(db, request, PASSWORD_SET, email=user.email, user=user)
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
        .options(
            joinedload(User.role).joinedload(Role.permissions),
            joinedload(User.azure_role).joinedload(Role.permissions),
            joinedload(User.aws_role).joinedload(Role.permissions),
        )
        .where(User.id == current_user.id)
    )

    user = db.execute(statement).unique().scalar_one()

    def access(role: Role | None) -> CloudAccessResponse | None:
        if role is None:
            return None
        return CloudAccessResponse(
            role_code=role.code,
            role_name=role.name,
            permissions=sorted(
                p.code for p in role.permissions if p.code.startswith("vm.")
            ),
        )

    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        role_code=user.role.code,
        role_name=user.role.name,
        permissions=sorted(permission.code for permission in user.role.permissions),
        cloud_access={"azure": access(user.azure_role), "aws": access(user.aws_role)},
    )
