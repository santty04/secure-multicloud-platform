import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.models import Permission, Role, User


def create_test_user(
    db_session: Session,
    role_code: str,
    permission_codes: set[str],
) -> User:
    role = Role(
        code=role_code,
        name=role_code.title(),
        description=f"Test role {role_code}",
        permissions=[
            Permission(
                code=permission_code,
                description=f"Permission {permission_code}",
            )
            for permission_code in permission_codes
        ],
    )

    user = User(
        email=f"{role_code}@example.com",
        full_name=f"{role_code.title()} User",
        password_hash="not-used-in-these-tests",
        is_active=True,
        role=role,
    )

    db_session.add(user)
    db_session.flush()

    return user


def authorization_header(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id))

    return {
        "Authorization": f"Bearer {token}",
    }


def assert_forbidden(response) -> None:
    assert response.status_code == 403

    body = response.json()

    assert body["error"]["code"] == "http_error"
    assert body["error"]["message"] == "Insufficient permissions."
    assert uuid.UUID(body["error"]["correlation_id"])


@pytest.fixture
def administrator(db_session: Session) -> User:
    return create_test_user(
        db_session,
        role_code="administrator",
        permission_codes={
            "vm.read",
            "vm.create",
            "vm.start",
            "vm.stop",
            "vm.update",
            "vm.delete",
            "operation.read",
            "user.manage",
        },
    )


@pytest.fixture
def operator(db_session: Session) -> User:
    return create_test_user(
        db_session,
        role_code="operator",
        permission_codes={
            "vm.read",
            "vm.start",
            "vm.stop",
            "operation.read",
        },
    )


@pytest.fixture
def viewer(db_session: Session) -> User:
    return create_test_user(
        db_session,
        role_code="viewer",
        permission_codes={
            "vm.read",
            "operation.read",
        },
    )


def test_unauthenticated_user_cannot_list_instances(
    client: TestClient,
):
    response = client.get("/api/v1/instances")

    assert response.status_code == 401


def test_viewer_can_list_instances(
    client: TestClient,
    viewer: User,
):
    response = client.get(
        "/api/v1/instances",
        headers=authorization_header(viewer),
    )

    assert response.status_code == 200
    assert response.json() == []


def test_viewer_cannot_start_instance(
    client: TestClient,
    viewer: User,
):
    resource_id = uuid.uuid4()

    response = client.post(
        f"/api/v1/instances/azure/{resource_id}/start",
        headers=authorization_header(viewer),
    )

    assert_forbidden(response)


def test_operator_can_start_instance(
    client: TestClient,
    operator: User,
):
    resource_id = uuid.uuid4()

    response = client.post(
        f"/api/v1/instances/aws/{resource_id}/start",
        headers=authorization_header(operator),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["resource_id"] == str(resource_id)
    assert body["provider"] == "aws"
    assert body["action"] == "start"
    assert body["status"] == "simulated"
    assert body["requested_by"] == str(operator.id)


def test_operator_can_stop_instance(
    client: TestClient,
    operator: User,
):
    resource_id = uuid.uuid4()

    response = client.post(
        f"/api/v1/instances/azure/{resource_id}/stop",
        headers=authorization_header(operator),
    )

    assert response.status_code == 200
    assert response.json()["action"] == "stop"
    assert response.json()["status"] == "simulated"


def test_operator_cannot_delete_instance(
    client: TestClient,
    operator: User,
):
    resource_id = uuid.uuid4()

    response = client.delete(
        f"/api/v1/instances/aws/{resource_id}",
        headers=authorization_header(operator),
    )

    assert_forbidden(response)


def test_administrator_can_delete_instance(
    client: TestClient,
    administrator: User,
):
    resource_id = uuid.uuid4()

    response = client.delete(
        f"/api/v1/instances/azure/{resource_id}",
        headers=authorization_header(administrator),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["resource_id"] == str(resource_id)
    assert body["provider"] == "azure"
    assert body["action"] == "delete"
    assert body["status"] == "simulated"
    assert body["requested_by"] == str(administrator.id)


def test_invalid_provider_is_rejected(
    client: TestClient,
    administrator: User,
):
    resource_id = uuid.uuid4()

    response = client.post(
        f"/api/v1/instances/google/{resource_id}/start",
        headers=authorization_header(administrator),
    )

    assert response.status_code == 422
