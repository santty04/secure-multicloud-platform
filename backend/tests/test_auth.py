import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.db.models import Permission, Role, User


ADMIN_EMAIL = "admin.test@example.com"
ADMIN_PASSWORD = "TestPassword123!"


def assert_error_response(
    response,
    expected_status: int,
    expected_message: str,
) -> None:
    assert response.status_code == expected_status

    body = response.json()

    assert "error" in body
    assert body["error"]["code"] == "http_error"
    assert body["error"]["message"] == expected_message

    correlation_id = body["error"]["correlation_id"]
    assert uuid.UUID(correlation_id)


@pytest.fixture
def admin_user(db_session: Session) -> User:
    permissions = [
        Permission(
            code="vm.read",
            description="Read virtual machines.",
        ),
        Permission(
            code="user.manage",
            description="Manage users.",
        ),
    ]

    role = Role(
        code="administrator",
        name="Administrador",
        description="Platform administrator.",
        permissions=permissions,
    )

    user = User(
        email=ADMIN_EMAIL,
        full_name="Test Administrator",
        password_hash=hash_password(ADMIN_PASSWORD),
        is_active=True,
        role=role,
    )

    db_session.add(user)
    db_session.flush()

    return user


def login(
    client: TestClient,
    email: str = ADMIN_EMAIL,
    password: str = ADMIN_PASSWORD,
):
    return client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )


def test_login_with_valid_credentials(
    client: TestClient,
    admin_user: User,
):
    response = login(client)

    assert response.status_code == 200

    body = response.json()

    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]


def test_login_rejects_incorrect_password(
    client: TestClient,
    admin_user: User,
):
    response = login(
        client,
        password="IncorrectPassword123!",
    )

    assert_error_response(
        response,
        expected_status=401,
        expected_message="Invalid email or password.",
    )


def test_login_rejects_unknown_user(
    client: TestClient,
):
    response = login(
        client,
        email="unknown@example.com",
    )

    assert_error_response(
        response,
        expected_status=401,
        expected_message="Invalid email or password.",
    )


def test_me_rejects_inactive_user(
    client: TestClient,
    admin_user: User,
    db_session: Session,
):
    token = create_access_token(str(admin_user.id))

    admin_user.is_active = False
    db_session.flush()

    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert_error_response(
        response,
        expected_status=403,
        expected_message="User account is inactive.",
    )


def test_me_rejects_invalid_token(
    client: TestClient,
):
    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": "Bearer invalid-token",
        },
    )

    assert_error_response(
        response,
        expected_status=401,
        expected_message=("Invalid or expired authentication credentials."),
    )


def test_me_returns_authenticated_user(
    client: TestClient,
    admin_user: User,
):
    login_response = login(client)
    token = login_response.json()["access_token"]

    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["id"] == str(admin_user.id)
    assert body["email"] == ADMIN_EMAIL
    assert body["full_name"] == "Test Administrator"
    assert body["is_active"] is True
    assert body["role_code"] == "administrator"
    assert body["role_name"] == "Administrador"
    assert body["permissions"] == [
        "user.manage",
        "vm.read",
    ]

    assert "password" not in body
    assert "password_hash" not in body


def test_me_rejects_inactive_user(
    client: TestClient,
    admin_user: User,
    db_session: Session,
):
    token = create_access_token(str(admin_user.id))

    admin_user.is_active = False
    db_session.flush()

    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert_error_response(
        response,
        expected_status=403,
        expected_message="User account is inactive.",
    )


def test_me_rejects_missing_token(
    client: TestClient,
):
    response = client.get("/api/v1/auth/me")

    assert_error_response(
        response,
        expected_status=401,
        expected_message=("Invalid or expired authentication credentials."),
    )


def test_me_rejects_token_for_unknown_user(
    client: TestClient,
):
    token = create_access_token(str(uuid.uuid4()))

    response = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert_error_response(
        response,
        expected_status=401,
        expected_message=("Invalid or expired authentication credentials."),
    )
