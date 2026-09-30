import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import PasswordSetupToken, User
from app.services.email import send_email
from app.services.email_templates import (
    render_password_reset_email,
    render_password_setup_email,
)

_TOKEN_BYTES = 32


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_password_setup_token(
    db: Session, user: User, *, expires_in: timedelta | None = None
) -> str:
    """Create a fresh one-time token for `user`, invalidating any outstanding ones.

    Activation and "forgot password" share this token: both let the holder of
    the mailbox pick a new password. Only the lifetime differs.
    """
    db.execute(
        update(PasswordSetupToken)
        .where(
            PasswordSetupToken.user_id == user.id,
            PasswordSetupToken.used_at.is_(None),
        )
        .values(used_at=datetime.now(UTC))
    )

    token = secrets.token_urlsafe(_TOKEN_BYTES)
    if expires_in is None:
        expires_in = timedelta(hours=settings.password_setup_token_expire_hours)
    expires_at = datetime.now(UTC) + expires_in
    db.add(
        PasswordSetupToken(
            user_id=user.id,
            token_hash=_hash_token(token),
            expires_at=expires_at,
        )
    )
    return token


def _find_valid_token(
    db: Session, token: str
) -> tuple[PasswordSetupToken, User] | None:
    record = db.scalar(
        select(PasswordSetupToken).where(
            PasswordSetupToken.token_hash == _hash_token(token)
        )
    )
    if (
        record is None
        or record.used_at is not None
        or record.expires_at < datetime.now(UTC)
    ):
        return None

    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        return None

    return record, user


def peek_password_setup_token(db: Session, token: str) -> User | None:
    """Look up the user a token belongs to without consuming it."""
    found = _find_valid_token(db, token)
    return found[1] if found else None


def redeem_password_setup_token(db: Session, token: str) -> User | None:
    """Consume a token and return the user it activates, if still valid."""
    found = _find_valid_token(db, token)
    if found is None:
        return None

    record, user = found
    record.used_at = datetime.now(UTC)
    return user


def send_password_setup_email(user: User, token: str) -> None:
    link = f"{settings.frontend_base_url.rstrip('/')}/set-password?token={token}"
    hours = settings.password_setup_token_expire_hours
    subject = f"Activa tu cuenta en {settings.email_from_name}"
    html = render_password_setup_email(
        app_name=settings.email_from_name,
        full_name=user.full_name,
        link=link,
        hours=hours,
    )
    text = (
        f"Hola {user.full_name},\n\n"
        f"Se creó una cuenta para ti en {settings.email_from_name}. "
        f"Define tu contraseña en el siguiente enlace:\n{link}\n\n"
        f"Este enlace vence en {hours} horas y solo puede usarse una vez.\n"
        "Si no esperabas este correo, puedes ignorarlo."
    )
    send_email(to=user.email, subject=subject, html=html, text=text)


def issue_password_reset_token(db: Session, user: User) -> str:
    return issue_password_setup_token(
        db,
        user,
        expires_in=timedelta(minutes=settings.password_reset_token_expire_minutes),
    )


def send_password_reset_email(user: User, token: str) -> None:
    link = (
        f"{settings.frontend_base_url.rstrip('/')}/set-password"
        f"?token={token}&mode=reset"
    )
    minutes = settings.password_reset_token_expire_minutes
    subject = f"Restablece tu contraseña en {settings.email_from_name}"
    html = render_password_reset_email(
        app_name=settings.email_from_name,
        full_name=user.full_name,
        link=link,
        minutes=minutes,
    )
    text = (
        f"Hola {user.full_name},\n\n"
        f"Recibimos una solicitud para restablecer tu contraseña en "
        f"{settings.email_from_name}. Define una nueva en el siguiente enlace:\n"
        f"{link}\n\n"
        f"Este enlace vence en {minutes} minutos y solo puede usarse una vez.\n"
        "Si no lo solicitaste, ignora este correo: tu contraseña actual sigue "
        "siendo válida."
    )
    send_email(to=user.email, subject=subject, html=html, text=text)
