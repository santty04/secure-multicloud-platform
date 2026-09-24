import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import AuthEvent, User

LOGIN_SUCCEEDED = "login_succeeded"
PASSWORD_FAILED = "password_failed"
CODE_SENT = "code_sent"
CODE_RESENT = "code_resent"
CODE_FAILED = "code_failed"
CHALLENGE_LOCKED = "challenge_locked"
LOGIN_THROTTLED = "login_throttled"

# Failures that count towards the per-account lockout.
_FAILURES = (PASSWORD_FAILED, CODE_FAILED)


def _client_ip(request: Request) -> str | None:
    # Behind Vercel and the Container Apps ingress the socket peer is a proxy,
    # so the first X-Forwarded-For hop is the best available hint. It can be
    # spoofed, which is why it is only recorded and never used to block.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else None


def _correlation_id(request: Request) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(getattr(request.state, "correlation_id", "")))
    except ValueError:
        return None


def record_auth_event(
    db: Session,
    request: Request,
    event_type: str,
    *,
    email: str,
    user: User | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    db.add(
        AuthEvent(
            event_type=event_type,
            email=email,
            user_id=user.id if user else None,
            correlation_id=_correlation_id(request),
            ip_address=_client_ip(request),
            user_agent=(request.headers.get("user-agent") or "")[:300] or None,
            details=details,
        )
    )


def lock_account_attempts(db: Session, email: str) -> None:
    """Serialize concurrent sign-ins for one address until the transaction ends.

    Without it, parallel requests could all read the failure count before any
    of them records its own failure and slip past the limit together.
    """
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": email})


def login_retry_after(db: Session, email: str) -> int | None:
    """Seconds until `email` may try again, or None if it is not locked out."""
    window = timedelta(minutes=settings.login_lockout_window_minutes)
    since = datetime.now(UTC) - window
    failures = db.scalars(
        select(AuthEvent.created_at)
        .where(
            AuthEvent.email == email,
            AuthEvent.event_type.in_(_FAILURES),
            AuthEvent.created_at >= since,
        )
        .order_by(AuthEvent.created_at.desc())
        .limit(settings.login_max_failures)
    ).all()

    if len(failures) < settings.login_max_failures:
        return None

    # Locked until the oldest of the last N failures leaves the window.
    unlock_at = failures[-1] + window
    return max(1, int((unlock_at - datetime.now(UTC)).total_seconds()) + 1)
