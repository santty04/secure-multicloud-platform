import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.models import (
    ManagedResource,
    Permission,
    Role,
    User,
)


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


def authorization_header(
    user: User,
) -> dict[str, str]:
    token = create_access_token(str(user.id))

    return {
        "Authorization": f"Bearer {token}",
    }


def assert_error_response(
    response,
    expected_status: int,
    expected_message: str,
    expected_code: str = "http_error",
) -> None:
    assert response.status_code == expected_status

    body = response.json()

    assert "error" in body
    assert body["error"]["code"] == expected_code
    assert body["error"]["message"] == expected_message

    correlation_id = body["error"]["correlation_id"]
    assert uuid.UUID(correlation_id)


@pytest.fixture
def administrator(
    db_session: Session,
) -> User:
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
def operator(
    db_session: Session,
) -> User:
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
def viewer(
    db_session: Session,
) -> User:
    return create_test_user(
        db_session,
        role_code="viewer",
        permission_codes={
            "vm.read",
            "operation.read",
        },
    )


@pytest.fixture
def managed_resource(
    db_session: Session,
) -> ManagedResource:
    resource = ManagedResource(
        provider="azure",
        cloud_resource_id=(
            "/subscriptions/test/"
            "resourceGroups/test/"
            "providers/Microsoft.Compute/"
            "virtualMachines/test-vm"
        ),
        name="test-azure-vm",
        resource_type="virtual_machine",
        region="eastus2",
        environment="test",
        status="stopped",
        is_managed=True,
    )

    db_session.add(resource)
    db_session.flush()

    return resource


def test_unauthenticated_user_cannot_list_instances(
    client: TestClient,
):
    response = client.get("/api/v1/instances")

    assert_error_response(
        response,
        expected_status=401,
        expected_message=(
            "Invalid or expired authentication credentials."
        ),
    )


def test_viewer_can_list_instances(
    client: TestClient,
    viewer: User,
    managed_resource: ManagedResource,
):
    response = client.get(
        "/api/v1/instances",
        headers=authorization_header(viewer),
    )

    assert response.status_code == 200

    body = response.json()

    assert len(body) == 1
    assert body[0]["id"] == str(managed_resource.id)
    assert body[0]["name"] == "test-azure-vm"
    assert body[0]["provider"] == "azure"
    assert body[0]["resource_type"] == "virtual_machine"
    assert body[0]["region"] == "eastus2"
    assert body[0]["environment"] == "test"
    assert body[0]["status"] == "stopped"
    assert body[0]["is_managed"] is True


def test_viewer_cannot_start_instance(
    client: TestClient,
    viewer: User,
):
    resource_id = uuid.uuid4()

    response = client.post(
        (
            f"/api/v1/instances/azure/"
            f"{resource_id}/start"
        ),
        headers=authorization_header(viewer),
    )

    assert_error_response(
        response,
        expected_status=403,
        expected_message="Insufficient permissions.",
    )


def test_operator_can_start_instance(
    client: TestClient,
    operator: User,
    managed_resource: ManagedResource,
):
    response = client.post(
        (
            f"/api/v1/instances/azure/"
            f"{managed_resource.id}/start"
        ),
        headers=authorization_header(operator),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["resource_id"] == str(managed_resource.id)
    assert body["provider"] == "azure"
    assert body["action"] == "start"
    assert body["status"] == "simulated"
    assert body["requested_by"] == str(operator.id)


def test_operator_can_stop_instance(
    client: TestClient,
    operator: User,
    managed_resource: ManagedResource,
):
    response = client.post(
        (
            f"/api/v1/instances/azure/"
            f"{managed_resource.id}/stop"
        ),
        headers=authorization_header(operator),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["resource_id"] == str(managed_resource.id)
    assert body["provider"] == "azure"
    assert body["action"] == "stop"
    assert body["status"] == "simulated"
    assert body["requested_by"] == str(operator.id)


def test_operator_cannot_delete_instance(
    client: TestClient,
    operator: User,
):
    resource_id = uuid.uuid4()

    response = client.delete(
        f"/api/v1/instances/aws/{resource_id}",
        headers=authorization_header(operator),
    )

    assert_error_response(
        response,
        expected_status=403,
        expected_message="Insufficient permissions.",
    )


def test_administrator_can_delete_instance(
    client: TestClient,
    administrator: User,
    managed_resource: ManagedResource,
):
    response = client.delete(
        (
            f"/api/v1/instances/azure/"
            f"{managed_resource.id}"
        ),
        headers=authorization_header(administrator),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["resource_id"] == str(managed_resource.id)
    assert body["provider"] == "azure"
    assert body["action"] == "delete"
    assert body["status"] == "simulated"
    assert body["requested_by"] == str(administrator.id)


def test_unknown_resource_is_rejected(
    client: TestClient,
    administrator: User,
):
    resource_id = uuid.uuid4()

    response = client.post(
        (
            f"/api/v1/instances/azure/"
            f"{resource_id}/start"
        ),
        headers=authorization_header(administrator),
    )

    assert_error_response(
        response,
        expected_status=404,
        expected_message="Resource not found.",
        expected_code="resource_not_found",
    )


def test_provider_must_match_registered_resource(
    client: TestClient,
    administrator: User,
    managed_resource: ManagedResource,
):
    response = client.post(
        (
            f"/api/v1/instances/aws/"
            f"{managed_resource.id}/start"
        ),
        headers=authorization_header(administrator),
    )

    assert_error_response(
        response,
        expected_status=404,
        expected_message="Resource not found.",
        expected_code="resource_not_found",
    )


def test_invalid_provider_is_rejected(
    client: TestClient,
    administrator: User,
    managed_resource: ManagedResource,
):
    response = client.post(
        (
            f"/api/v1/instances/google/"
            f"{managed_resource.id}/start"
        ),
        headers=authorization_header(administrator),
    )

    assert response.status_code == 422