from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.db.models import AuthEvent, PasswordSetupToken, Role, User
from app.services.email import EmailDeliveryError

EMAIL = "forgot.user@example.com"
OLD_PASSWORD = "OldPassword123!"
NEW_PASSWORD = "BrandNewPassword456!"


@pytest.fixture
def user(db_session) -> User:
    account = User(
        email=EMAIL,
        full_name="Forgot User",
        password_hash=hash_password(OLD_PASSWORD),
        is_active=True,
        role=Role(code="viewer", name="Viewer"),
    )
    db_session.add(account)
    db_session.flush()
    return account


@pytest.fixture
def reset_emails(monkeypatch) -> list[dict]:
    sent: list[dict] = []

    def _fake_send(user, token) -> None:
        sent.append({"email": user.email, "token": token})

    monkeypatch.setattr("app.api.routes.auth.send_password_reset_email", _fake_send)
    return sent


def forgot(client, email=EMAIL):
    return client.post("/api/v1/auth/forgot-password", json={"email": email})


def event_types(db_session, email=EMAIL) -> list[str]:
    return list(
        db_session.scalars(
            select(AuthEvent.event_type)
            .where(AuthEvent.email == email)
            .order_by(AuthEvent.created_at)
        )
    )


def test_forgot_password_emails_a_reset_link(client, db_session, user, reset_emails):
    response = forgot(client, "  Forgot.User@Example.com ")

    assert response.status_code == 202
    assert len(reset_emails) == 1
    assert reset_emails[0]["email"] == EMAIL

    record = db_session.scalar(
        select(PasswordSetupToken).where(PasswordSetupToken.user_id == user.id)
    )
    lifetime = record.expires_at - datetime.now(UTC)
    assert lifetime <= timedelta(minutes=settings.password_reset_token_expire_minutes)
    assert event_types(db_session) == ["password_reset_requested"]


def test_reset_link_sets_new_password(client, db_session, user, reset_emails):
    forgot(client)
    token = reset_emails[0]["token"]

    info = client.get(f"/api/v1/auth/set-password/{token}")
    assert info.status_code == 200
    assert info.json()["email"] == EMAIL

    response = client.post(
        "/api/v1/auth/set-password",
        json={"token": token, "password": NEW_PASSWORD},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]

    db_session.refresh(user)
    assert verify_password(NEW_PASSWORD, user.password_hash)
    assert "password_set" in event_types(db_session)

    reused = client.post(
        "/api/v1/auth/set-password",
        json={"token": token, "password": "AnotherPassword789!"},
    )
    assert reused.status_code == 400


def test_new_request_invalidates_previous_link(client, user, reset_emails):
    forgot(client)
    forgot(client)
    first, second = (sent["token"] for sent in reset_emails)

    assert client.get(f"/api/v1/auth/set-password/{first}").status_code == 400
    assert client.get(f"/api/v1/auth/set-password/{second}").status_code == 200


@pytest.mark.parametrize("active", [False, None])
def test_forgot_password_gives_same_answer_without_account(
    client, db_session, user, reset_emails, active
):
    if active is None:
        email = "nobody@example.com"
    else:
        user.is_active = active
        db_session.flush()
        email = EMAIL

    response = forgot(client, email)
    known = forgot(client, "other@example.com")

    assert response.status_code == 202
    assert response.json() == known.json()
    assert reset_emails == []
    assert event_types(db_session, email) == ["password_reset_requested"]


def test_forgot_password_is_throttled_per_address(
    client, db_session, user, reset_emails
):
    for _ in range(settings.password_reset_max_requests + 2):
        assert forgot(client).status_code == 202

    assert len(reset_emails) == settings.password_reset_max_requests
    assert event_types(db_session).count("password_reset_throttled") == 2


def test_forgot_password_hides_delivery_failures(client, user, monkeypatch):
    def _broken(user, token) -> None:
        raise EmailDeliveryError("down")

    monkeypatch.setattr("app.api.routes.auth.send_password_reset_email", _broken)

    assert forgot(client).status_code == 202
