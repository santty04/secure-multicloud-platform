from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.db.models import AuthEvent, Permission, Role, User

EMAIL = "events.user@example.com"
PASSWORD = "EventsPassword123!"


@pytest.fixture
def user(db_session) -> User:
    manage = Permission(code="user.manage", description="Manage users.")
    role = Role(code="administrator", name="Admin", permissions=[manage])
    account = User(
        email=EMAIL,
        full_name="Events User",
        password_hash=hash_password(PASSWORD),
        is_active=True,
        role=role,
    )
    db_session.add(account)
    db_session.flush()
    return account


@pytest.fixture
def viewer(db_session) -> User:
    account = User(
        email="viewer.events@example.com",
        full_name="Viewer",
        password_hash=hash_password(PASSWORD),
        is_active=True,
        role=Role(code="viewer", name="Viewer"),
    )
    db_session.add(account)
    db_session.flush()
    return account


def login(client, email=EMAIL, password=PASSWORD):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers={
            "User-Agent": "pytest-agent",
            "X-Forwarded-For": "203.0.113.7, 10.0.0.1",
        },
    )


def events(db_session, email=EMAIL):
    return list(
        db_session.scalars(
            select(AuthEvent)
            .where(AuthEvent.email == email)
            .order_by(AuthEvent.created_at, AuthEvent.event_type)
        )
    )


def test_successful_login_is_recorded(client, user, db_session):
    response = login(client)
    assert response.status_code == 200

    [event] = events(db_session)
    assert event.event_type == "login_succeeded"
    assert event.user_id == user.id
    assert event.ip_address == "203.0.113.7"
    assert event.user_agent == "pytest-agent"
    assert str(event.correlation_id) == response.headers["X-Correlation-ID"]
    assert event.details == {"mfa": False}


@pytest.mark.parametrize(
    ("email", "password", "reason"),
    [
        (EMAIL, "WrongPassword123!", "wrong_password"),
        ("nobody@example.com", PASSWORD, "unknown_account"),
    ],
)
def test_failed_login_is_recorded_without_the_password(
    client, user, db_session, email, password, reason
):
    response = login(client, email=email, password=password)
    assert response.status_code == 401

    [event] = events(db_session, email=email)
    assert event.event_type == "password_failed"
    assert event.details == {"reason": reason}
    assert password not in str(event.details)


def test_inactive_account_is_recorded_as_failure(client, user, db_session):
    user.is_active = False
    db_session.flush()
    assert login(client).status_code == 401
    assert events(db_session)[0].details == {"reason": "inactive_account"}


def test_account_is_throttled_after_repeated_failures(client, user, db_session):
    for _ in range(settings.login_max_failures):
        assert login(client, password="WrongPassword123!").status_code == 401

    # Even the right password is refused while locked out.
    blocked = login(client)
    assert blocked.status_code == 429
    retry_after = int(blocked.headers["Retry-After"])
    assert 0 < retry_after <= settings.login_lockout_window_minutes * 60
    kinds = [event.event_type for event in events(db_session)]
    assert kinds.count("login_throttled") == 1


def test_unknown_email_is_throttled_the_same_way(client, user):
    # Same behaviour for unregistered addresses, so lockouts reveal nothing.
    for _ in range(settings.login_max_failures):
        assert login(client, email="ghost@example.com").status_code == 401
    assert login(client, email="ghost@example.com").status_code == 429
    # Other accounts are unaffected.
    assert login(client).status_code == 200


def test_lockout_expires_after_the_window(client, user, db_session):
    for _ in range(settings.login_max_failures):
        login(client, password="WrongPassword123!")
    for event in events(db_session):
        event.created_at = datetime.now(UTC) - timedelta(
            minutes=settings.login_lockout_window_minutes, seconds=1
        )
    db_session.flush()
    assert login(client).status_code == 200


def test_mfa_code_events_and_failures_count_towards_lockout(
    client, user, db_session, monkeypatch
):
    codes: list[str] = []
    monkeypatch.setattr(settings, "mfa_enabled", True)
    monkeypatch.setattr(
        "app.api.routes.auth.send_login_code_email",
        lambda user, code: codes.append(code),
    )

    challenge_id = login(client).json()["challenge_id"]
    wrong = f"{(int(codes[0]) + 1) % 10**6:06d}"
    for _ in range(settings.login_code_max_attempts):
        client.post(
            "/api/v1/auth/login/verify",
            json={"challenge_id": challenge_id, "code": wrong},
        )

    kinds = [event.event_type for event in events(db_session)]
    assert kinds.count("code_sent") == 1
    assert kinds.count("code_failed") == settings.login_code_max_attempts
    assert kinds.count("challenge_locked") == 1

    # Code guesses are failures too: a fresh challenge cannot reset the budget.
    monkeypatch.setattr(
        settings, "login_max_failures", settings.login_code_max_attempts
    )
    assert login(client).status_code == 429


def test_mfa_success_is_recorded(client, user, db_session, monkeypatch):
    codes: list[str] = []
    monkeypatch.setattr(settings, "mfa_enabled", True)
    monkeypatch.setattr(
        "app.api.routes.auth.send_login_code_email",
        lambda user, code: codes.append(code),
    )
    challenge_id = login(client).json()["challenge_id"]
    ok = client.post(
        "/api/v1/auth/login/verify",
        json={"challenge_id": challenge_id, "code": codes[0]},
    )
    assert ok.status_code == 200
    [success] = [e for e in events(db_session) if e.event_type == "login_succeeded"]
    assert success.details["mfa"] is True


def test_only_managers_can_list_auth_events(client, user, viewer):
    login(client, password="WrongPassword123!")
    login(client)

    def auth(account):
        return {
            "Authorization": f"Bearer {create_access_token(subject=str(account.id))}"
        }

    assert client.get("/api/v1/auth-events").status_code == 401
    assert client.get("/api/v1/auth-events", headers=auth(viewer)).status_code == 403

    page = client.get(
        f"/api/v1/auth-events?email={EMAIL.upper()}&limit=1", headers=auth(user)
    ).json()
    assert page["total"] == 2 and len(page["items"]) == 1

    failed = client.get(
        "/api/v1/auth-events?event_type=password_failed", headers=auth(user)
    ).json()
    assert [item["event_type"] for item in failed["items"]] == ["password_failed"]
