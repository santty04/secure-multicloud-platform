import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import LoginChallenge, User
from app.services.email import send_email
from app.services.email_templates import render_login_code_email


class ResendNotAllowedError(Exception):
    """The code cannot be resent yet (cooldown) or ever again (limit)."""

    def __init__(self, retry_after: int | None = None) -> None:
        super().__init__("Login code resend not allowed.")
        self.retry_after = retry_after


def _hash_code(challenge_id: uuid.UUID, code: str) -> str:
    # Keyed and bound to the challenge: a 6-digit code has only 10^6 values,
    # so a plain digest stored in the database would be trivially reversible.
    message = f"{challenge_id}:{code}".encode()
    return hmac.new(settings.secret_key.encode(), message, hashlib.sha256).hexdigest()


def _new_code() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def _expiry(now: datetime) -> datetime:
    return now + timedelta(minutes=settings.login_code_expire_minutes)


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}"


def start_login_challenge(db: Session, user: User) -> tuple[LoginChallenge, str]:
    """Open a new challenge for `user`, cancelling any still pending."""
    now = datetime.now(UTC)
    db.execute(
        update(LoginChallenge)
        .where(
            LoginChallenge.user_id == user.id,
            LoginChallenge.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )

    code = _new_code()
    challenge = LoginChallenge(
        id=uuid.uuid4(),
        user_id=user.id,
        attempts=0,
        sends=1,
        expires_at=_expiry(now),
        last_sent_at=now,
    )
    challenge.code_hash = _hash_code(challenge.id, code)
    db.add(challenge)
    return challenge, code


def _pending_challenge(
    db: Session, challenge_id: uuid.UUID
) -> tuple[LoginChallenge, User] | None:
    # Row lock so concurrent guesses cannot race past the attempt limit.
    challenge = db.scalar(
        select(LoginChallenge)
        .where(LoginChallenge.id == challenge_id)
        .with_for_update()
    )
    if (
        challenge is None
        or challenge.consumed_at is not None
        or challenge.expires_at < datetime.now(UTC)
        or challenge.attempts >= settings.login_code_max_attempts
    ):
        return None

    user = db.get(User, challenge.user_id)
    if user is None or not user.is_active:
        return None

    return challenge, user


def verify_login_challenge(
    db: Session, challenge_id: uuid.UUID, code: str
) -> User | None:
    """Check `code`; every call counts as an attempt, so the caller must commit."""
    found = _pending_challenge(db, challenge_id)
    if found is None:
        return None

    challenge, user = found
    challenge.attempts += 1

    if hmac.compare_digest(challenge.code_hash, _hash_code(challenge.id, code)):
        challenge.consumed_at = datetime.now(UTC)
        return user

    if challenge.attempts >= settings.login_code_max_attempts:
        challenge.consumed_at = datetime.now(UTC)
    return None


def reissue_login_code(
    db: Session, challenge_id: uuid.UUID
) -> tuple[LoginChallenge, User, str] | None:
    """Replace the code of a pending challenge, keeping its attempt count."""
    found = _pending_challenge(db, challenge_id)
    if found is None:
        return None

    challenge, user = found
    now = datetime.now(UTC)
    if challenge.sends >= settings.login_code_max_sends:
        raise ResendNotAllowedError()

    ready_at = challenge.last_sent_at + timedelta(
        seconds=settings.login_code_resend_cooldown_seconds
    )
    if now < ready_at:
        raise ResendNotAllowedError(
            retry_after=int((ready_at - now).total_seconds()) + 1
        )

    code = _new_code()
    challenge.code_hash = _hash_code(challenge.id, code)
    challenge.sends += 1
    challenge.last_sent_at = now
    challenge.expires_at = _expiry(now)
    return challenge, user, code


def send_login_code_email(user: User, code: str) -> None:
    minutes = settings.login_code_expire_minutes
    subject = f"Tu código de verificación de {settings.email_from_name}"
    html = render_login_code_email(
        app_name=settings.email_from_name,
        full_name=user.full_name,
        code=code,
        minutes=minutes,
    )
    text = (
        f"Hola {user.full_name},\n\n"
        f"Tu código para iniciar sesión en {settings.email_from_name} es: {code}\n\n"
        f"Vence en {minutes} minutos y solo puede usarse una vez.\n"
        "Si no intentaste iniciar sesión, no compartas este código y avisa "
        "a un administrador."
    )
    send_email(to=user.email, subject=subject, html=html, text=text)
