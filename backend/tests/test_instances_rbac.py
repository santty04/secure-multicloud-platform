import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.models import (
    AuditLog,
    ManagedResource,
    Operation,
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
        expected_message=("Invalid or expired authentication credentials."),
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
        (f"/api/v1/instances/azure/{resource_id}/start"),
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
        (f"/api/v1/instances/azure/{managed_resource.id}/start"),
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
        (f"/api/v1/instances/azure/{managed_resource.id}/stop"),
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
        (f"/api/v1/instances/azure/{managed_resource.id}"),
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
        (f"/api/v1/instances/azure/{resource_id}/start"),
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
        (f"/api/v1/instances/aws/{managed_resource.id}/start"),
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
        (f"/api/v1/instances/google/{managed_resource.id}/start"),
        headers=authorization_header(administrator),
    )

    assert response.status_code == 422


# ============================================================
# AWS LIVE INVENTORY TESTS
# ============================================================


def test_viewer_can_list_live_aws_instances(
    client: TestClient,
    viewer: User,
    monkeypatch: pytest.MonkeyPatch,
):
    def mock_list_aws_instances(
        role_code: str,
    ) -> list[dict[str, str | None]]:
        assert role_code == "viewer"

        return [
            {
                "instance_id": "i-0123456789abcdef0",
                "name": "test-aws-vm",
                "state": "stopped",
                "instance_type": "t3.micro",
                "private_ip": "10.20.1.10",
                "provider": "aws",
                "region": "us-east-2",
            }
        ]

    monkeypatch.setattr(
        "app.api.routes.instances.list_aws_instances",
        mock_list_aws_instances,
    )

    response = client.get(
        "/api/v1/instances/aws/live",
        headers=authorization_header(viewer),
    )

    assert response.status_code == 200

    body = response.json()

    assert len(body) == 1
    assert body[0]["instance_id"] == "i-0123456789abcdef0"
    assert body[0]["name"] == "test-aws-vm"
    assert body[0]["state"] == "stopped"
    assert body[0]["instance_type"] == "t3.micro"
    assert body[0]["private_ip"] == "10.20.1.10"
    assert body[0]["provider"] == "aws"
    assert body[0]["region"] == "us-east-2"


def test_unauthenticated_user_cannot_list_live_aws_instances(
    client: TestClient,
):
    response = client.get(
        "/api/v1/instances/aws/live",
    )

    assert_error_response(
        response,
        expected_status=401,
        expected_message=("Invalid or expired authentication credentials."),
    )


# ============================================================
# OPERATIONS AND AUDIT TESTS
# ============================================================


def test_allowed_action_creates_operation_and_audit_log(
    client: TestClient,
    operator: User,
    managed_resource: ManagedResource,
    db_session: Session,
):
    response = client.post(
        (f"/api/v1/instances/azure/{managed_resource.id}/start"),
        headers=authorization_header(operator),
    )

    assert response.status_code == 200

    correlation_id = uuid.UUID(response.headers["X-Correlation-ID"])

    operation = db_session.scalar(
        select(Operation).where(Operation.correlation_id == correlation_id)
    )

    assert operation is not None
    assert operation.user_id == operator.id
    assert operation.resource_id == managed_resource.id
    assert operation.provider == "azure"
    assert operation.action == "start"
    assert operation.required_permission == "vm.start"
    assert operation.status == "success"
    assert operation.completed_at is not None
    assert operation.error_code is None
    assert operation.error_message is None

    audit_log = db_session.scalar(
        select(AuditLog).where(AuditLog.correlation_id == correlation_id)
    )

    assert audit_log is not None
    assert audit_log.operation_id == operation.id
    assert audit_log.user_id == operator.id
    assert audit_log.resource_id == managed_resource.id
    assert audit_log.provider == "azure"
    assert audit_log.action == "start"
    assert audit_log.decision == "allowed"
    assert audit_log.reason_code == "permission_granted"
    assert audit_log.required_permission == "vm.start"
    assert audit_log.role_code == "operator"
    assert audit_log.event_type == "operation"
    assert audit_log.http_method == "POST"


def test_denied_action_creates_only_audit_log(
    client: TestClient,
    viewer: User,
    managed_resource: ManagedResource,
    db_session: Session,
):
    response = client.post(
        (f"/api/v1/instances/azure/{managed_resource.id}/start"),
        headers=authorization_header(viewer),
    )

    assert response.status_code == 403

    correlation_id = uuid.UUID(response.headers["X-Correlation-ID"])

    operation = db_session.scalar(
        select(Operation).where(Operation.correlation_id == correlation_id)
    )

    assert operation is None

    audit_log = db_session.scalar(
        select(AuditLog).where(AuditLog.correlation_id == correlation_id)
    )

    assert audit_log is not None
    assert audit_log.operation_id is None
    assert audit_log.user_id == viewer.id
    assert audit_log.resource_id == managed_resource.id
    assert audit_log.provider == "azure"
    assert audit_log.action == "start"
    assert audit_log.decision == "denied"
    assert audit_log.reason_code == "permission_denied"
    assert audit_log.required_permission == "vm.start"
    assert audit_log.role_code == "viewer"
    assert audit_log.event_type == "authorization"
    assert audit_log.http_method == "POST"


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/operations",
        f"/api/v1/operations/{uuid.uuid4()}",
        "/api/v1/audit-logs",
    ],
)
def test_unauthenticated_user_cannot_read_operation_data(
    client: TestClient,
    path: str,
):
    response = client.get(path)

    assert response.status_code == 401


def test_operator_can_read_operations(
    client: TestClient,
    operator: User,
    managed_resource: ManagedResource,
):
    action_response = client.post(
        (f"/api/v1/instances/azure/{managed_resource.id}/start"),
        headers=authorization_header(operator),
    )

    assert action_response.status_code == 200

    correlation_id = action_response.headers["X-Correlation-ID"]

    list_response = client.get(
        "/api/v1/operations",
        headers=authorization_header(operator),
    )

    assert list_response.status_code == 200

    operations = list_response.json()

    operation = next(
        item for item in operations if item["correlation_id"] == correlation_id
    )

    assert operation["status"] == "success"
    assert operation["action"] == "start"
    assert operation["provider"] == "azure"

    detail_response = client.get(
        f"/api/v1/operations/{operation['id']}",
        headers=authorization_header(operator),
    )

    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == operation["id"]


def test_viewer_can_read_denied_audit_log(
    client: TestClient,
    viewer: User,
    managed_resource: ManagedResource,
):
    denied_response = client.post(
        (f"/api/v1/instances/azure/{managed_resource.id}/start"),
        headers=authorization_header(viewer),
    )

    assert denied_response.status_code == 403

    correlation_id = denied_response.headers["X-Correlation-ID"]

    audit_response = client.get(
        "/api/v1/audit-logs",
        headers=authorization_header(viewer),
    )

    assert audit_response.status_code == 200

    audit_logs = audit_response.json()

    audit_log = next(
        item for item in audit_logs if item["correlation_id"] == correlation_id
    )

    assert audit_log["decision"] == "denied"
    assert audit_log["reason_code"] == "permission_denied"
    assert audit_log["required_permission"] == "vm.start"
    assert audit_log["role_code"] == "viewer"
    assert audit_log["operation_id"] is None


def test_unknown_operation_is_rejected(
    client: TestClient,
    viewer: User,
):
    operation_id = uuid.uuid4()

    response = client.get(
        f"/api/v1/operations/{operation_id}",
        headers=authorization_header(viewer),
    )

    assert_error_response(
        response,
        expected_status=404,
        expected_message="Operation not found.",
        expected_code="resource_not_found",
    )
