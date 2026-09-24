from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.models import LoginChallenge, Role, User
from app.services.email import EmailDeliveryError
from app.services.email_templates import render_login_code_email

EMAIL = "mfa.user@example.com"
PASSWORD = "MfaPassword123!"


@pytest.fixture
def user(db_session) -> User:
    role = Role(code="viewer", name="Viewer", description="Read only.")
    account = User(
        email=EMAIL,
        full_name="Mfa User",
        password_hash=hash_password(PASSWORD),
        is_active=True,
        role=role,
    )
    db_session.add(account)
    db_session.flush()
    return account


@pytest.fixture
def sent_codes(monkeypatch) -> list[str]:
    codes: list[str] = []
    monkeypatch.setattr(settings, "mfa_enabled", True)
    monkeypatch.setattr(
        "app.api.routes.auth.send_login_code_email",
        lambda user, code: codes.append(code),
    )
    return codes


def login(client, password=PASSWORD):
    return client.post(
        "/api/v1/auth/login", json={"email": EMAIL, "password": password}
    )


def verify(client, challenge_id, code):
    return client.post(
        "/api/v1/auth/login/verify",
        json={"challenge_id": challenge_id, "code": code},
    )


def wrong(code: str) -> str:
    return f"{(int(code) + 1) % 10**6:06d}"


def test_login_without_mfa_returns_token_directly(client, user):
    body = login(client).json()
    assert "access_token" in body and "challenge_id" not in body


def test_login_requires_emailed_code(client, user, sent_codes, db_session):
    response = login(client)
    assert response.status_code == 200
    body = response.json()
    assert "access_token" not in body
    assert body["mfa_required"] is True
    assert body["email_hint"] == "m***@example.com"
    assert len(sent_codes) == 1 and sent_codes[0].isdigit() and len(sent_codes[0]) == 6

    challenge = db_session.get(LoginChallenge, body["challenge_id"])
    assert sent_codes[0] not in challenge.code_hash

    assert verify(client, body["challenge_id"], wrong(sent_codes[0])).status_code == 400
    ok = verify(client, body["challenge_id"], sent_codes[0])
    assert ok.status_code == 200
    token = ok.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["email"] == EMAIL

    # Single use.
    assert verify(client, body["challenge_id"], sent_codes[0]).status_code == 400


def test_wrong_password_sends_no_code(client, user, sent_codes):
    assert login(client, password="WrongPassword123!").status_code == 401
    assert sent_codes == []


def test_too_many_attempts_locks_the_challenge(client, user, sent_codes):
    challenge_id = login(client).json()["challenge_id"]
    for _ in range(settings.login_code_max_attempts):
        assert verify(client, challenge_id, wrong(sent_codes[0])).status_code == 400
    assert verify(client, challenge_id, sent_codes[0]).status_code == 400


def test_expired_code_is_rejected(client, user, sent_codes, db_session):
    challenge_id = login(client).json()["challenge_id"]
    challenge = db_session.get(LoginChallenge, challenge_id)
    challenge.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db_session.flush()
    assert verify(client, challenge_id, sent_codes[0]).status_code == 400


def test_new_login_cancels_previous_challenge(client, user, sent_codes):
    first = login(client).json()["challenge_id"]
    second = login(client).json()["challenge_id"]
    assert verify(client, first, sent_codes[0]).status_code == 400
    assert verify(client, second, sent_codes[1]).status_code == 200


def test_resend_respects_cooldown_and_limit(client, user, sent_codes, monkeypatch):
    challenge_id = login(client).json()["challenge_id"]
    resend = lambda: client.post(
        "/api/v1/auth/login/resend", json={"challenge_id": challenge_id}
    )

    too_soon = resend()
    assert too_soon.status_code == 429
    assert int(too_soon.headers["Retry-After"]) > 0

    monkeypatch.setattr(settings, "login_code_resend_cooldown_seconds", 0)
    for _ in range(settings.login_code_max_sends - 1):
        assert resend().status_code == 200
    assert len(sent_codes) == settings.login_code_max_sends
    assert resend().status_code == 400

    # Only the latest code is valid.
    assert verify(client, challenge_id, sent_codes[0]).status_code == 400
    assert verify(client, challenge_id, sent_codes[-1]).status_code == 200


def test_inactive_user_cannot_finish_login(client, user, sent_codes, db_session):
    challenge_id = login(client).json()["challenge_id"]
    user.is_active = False
    db_session.flush()
    assert verify(client, challenge_id, sent_codes[0]).status_code == 400


def test_code_delivery_failure_returns_502(client, user, monkeypatch, db_session):
    monkeypatch.setattr(settings, "mfa_enabled", True)

    def _boom(user, code):
        raise EmailDeliveryError("provider down")

    monkeypatch.setattr("app.api.routes.auth.send_login_code_email", _boom)
    assert login(client).status_code == 502
    assert db_session.scalar(select(LoginChallenge)) is not None


def test_malformed_code_is_rejected(client, user, sent_codes):
    challenge_id = login(client).json()["challenge_id"]
    assert verify(client, challenge_id, "12ab56").status_code == 422


def test_login_code_email_escapes_user_input():
    html = render_login_code_email(
        app_name="SMP", full_name="<b>x</b>", code="012345", minutes=5
    )
    assert "<b>x</b>" not in html and "&lt;b&gt;x&lt;/b&gt;" in html
    assert "012345" in html and "5 minutos" in html
