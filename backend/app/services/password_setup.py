import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import PasswordSetupToken, User
from app.services.email import send_email

_TOKEN_BYTES = 32


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_password_setup_token(db: Session, user: User) -> str:
    """Create a fresh one-time token for `user`, invalidating any outstanding ones."""
    db.execute(
        update(PasswordSetupToken)
        .where(
            PasswordSetupToken.user_id == user.id,
            PasswordSetupToken.used_at.is_(None),
        )
        .values(used_at=datetime.now(UTC))
    )

    token = secrets.token_urlsafe(_TOKEN_BYTES)
    expires_at = datetime.now(UTC) + timedelta(
        hours=settings.password_setup_token_expire_hours
    )
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
    subject = f"Activa tu cuenta en {settings.app_name}"
    html = (
        f"<p>Hola {user.full_name},</p>"
        f"<p>Se creó una cuenta para ti en {settings.app_name}. "
        "Define tu contraseña para activarla:</p>"
        f'<p><a href="{link}">Definir contraseña</a></p>'
        f"<p>Este enlace vence en {hours} horas y solo puede usarse una vez. "
        "Si no esperabas este correo, ignóralo.</p>"
    )
    text = (
        f"Hola {user.full_name},\n\n"
        f"Se creó una cuenta para ti en {settings.app_name}. "
        f"Define tu contraseña en el siguiente enlace:\n{link}\n\n"
        f"Este enlace vence en {hours} horas y solo puede usarse una vez."
    )
    send_email(to=user.email, subject=subject, html=html, text=text)
