"""Per-cloud VM access: a user's role in Azure and in AWS are independent."""

import pytest
from sqlalchemy import select

from app.core.security import create_access_token, hash_password
from app.db.models import (
    AuditLog,
    ManagedResource,
    Permission,
    ProvisioningRequest,
    Role,
    User,
)

VM_ALL = {"vm.read", "vm.create", "vm.start", "vm.stop", "vm.update", "vm.delete"}


_PERMISSIONS: dict[str, Permission] = {}


def perm(code: str) -> Permission:
    # Permission codes are unique: every role in a test shares one row per code.
    return _PERMISSIONS.setdefault(code, Permission(code=code, description=code))


def make_role(code: str, permissions: set[str]) -> Role:
    return Role(
        code=code,
        name=code.title(),
        permissions=[perm(p) for p in sorted(permissions)],
    )


@pytest.fixture(autouse=True)
def fresh_permissions():
    _PERMISSIONS.clear()


@pytest.fixture(autouse=True)
def simulated_clouds(monkeypatch):
    # Never reach real clouds from these tests, whatever the local .env says.
    monkeypatch.setattr("app.api.routes.instances.settings.aws_write_enabled", False)
    monkeypatch.setattr("app.api.routes.instances.settings.azure_write_enabled", False)


@pytest.fixture
def roles(db_session):
    platform = make_role("platform_viewer", {"operation.read"})
    administrator = make_role("administrator", VM_ALL)
    viewer = make_role("viewer", {"vm.read"})
    db_session.add_all([platform, administrator, viewer])
    db_session.flush()
    return {"platform": platform, "administrator": administrator, "viewer": viewer}


def make_user(db_session, roles, email, *, azure=None, aws=None) -> User:
    user = User(
        email=email,
        full_name=email.split("@")[0],
        password_hash=hash_password("unused-password-123"),
        is_active=True,
        role=roles["platform"],
        azure_role=roles[azure] if azure else None,
        aws_role=roles[aws] if aws else None,
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture
def aws_admin_azure_viewer(db_session, roles) -> User:
    return make_user(
        db_session, roles, "mixed@example.com", azure="viewer", aws="administrator"
    )


@pytest.fixture
def aws_only(db_session, roles) -> User:
    return make_user(db_session, roles, "awsonly@example.com", aws="viewer")


@pytest.fixture
def resources(db_session):
    azure = ManagedResource(
        provider="azure",
        cloud_resource_id="/subscriptions/t/resourceGroups/t/providers/Microsoft.Compute/virtualMachines/vm",
        name="azure-vm",
        resource_type="virtual_machine",
        region="eastus2",
        environment="test",
        status="stopped",
        is_managed=True,
    )
    aws = ManagedResource(
        provider="aws",
        cloud_resource_id="i-0123456789abcdef0",
        name="aws-vm",
        resource_type="virtual_machine",
        region="us-east-2",
        environment="test",
        status="stopped",
        is_managed=True,
    )
    db_session.add_all([azure, aws])
    db_session.flush()
    return {"azure": azure, "aws": aws}


def auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


def last_denial(db_session) -> AuditLog:
    return db_session.scalar(
        select(AuditLog)
        .where(AuditLog.decision == "denied")
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    )


def test_actions_follow_the_role_of_each_cloud(
    client, aws_admin_azure_viewer, resources, db_session
):
    user = aws_admin_azure_viewer

    # AWS administrator: can start. Execution is simulated in tests and the
    # audit records the AWS role that authorized it.
    started = client.post(
        f"/api/v1/instances/aws/{resources['aws'].id}/start", headers=auth(user)
    )
    assert started.status_code == 200
    allowed = db_session.scalar(
        select(AuditLog).where(
            AuditLog.decision == "allowed", AuditLog.provider == "aws"
        )
    )
    assert allowed.role_code == "administrator"

    # Azure viewer: may read, may not start.
    denied = client.post(
        f"/api/v1/instances/azure/{resources['azure'].id}/start", headers=auth(user)
    )
    assert denied.status_code == 403
    audit = last_denial(db_session)
    assert audit.provider == "azure"
    assert audit.reason_code == "permission_denied"
    assert audit.role_code == "viewer"
    assert audit.resource_id == resources["azure"].id


def test_no_access_hides_that_cloud(client, aws_only, resources, db_session):
    listing = client.get("/api/v1/instances", headers=auth(aws_only))
    assert listing.status_code == 200
    assert [item["provider"] for item in listing.json()] == ["aws"]

    status = client.get(
        f"/api/v1/instances/azure/{resources['azure'].id}/status",
        headers=auth(aws_only),
    )
    assert status.status_code == 403
    audit = last_denial(db_session)
    assert audit.reason_code == "cloud_access_denied"
    assert audit.role_code is None


def test_user_without_any_cloud_sees_an_empty_list(
    client, db_session, roles, resources
):
    nobody = make_user(db_session, roles, "nocloud@example.com")
    response = client.get("/api/v1/instances", headers=auth(nobody))
    assert response.status_code == 200 and response.json() == []


def test_live_aws_inventory_needs_aws_read(client, db_session, roles):
    azure_viewer = make_user(db_session, roles, "azureonly@example.com", azure="viewer")
    assert (
        client.get("/api/v1/instances/aws/live", headers=auth(azure_viewer)).status_code
        == 403
    )


def test_create_is_checked_against_the_target_cloud(client, aws_admin_azure_viewer):
    # Azure viewer cannot create in Azure even though it administers AWS.
    response = client.post(
        "/api/v1/instances/azure",
        headers=auth(aws_admin_azure_viewer),
        json={"name": "blocked-vm"},
    )
    assert response.status_code == 403


def test_platform_role_no_longer_grants_vm_access(client, db_session, roles, resources):
    # A platform administrator with no cloud roles cannot touch any VM.
    roles["platform"].permissions.append(perm("vm.start"))
    db_session.flush()
    nobody = make_user(db_session, roles, "platformonly@example.com")
    response = client.post(
        f"/api/v1/instances/aws/{resources['aws'].id}/start", headers=auth(nobody)
    )
    assert response.status_code == 403


def test_me_reports_cloud_access(client, aws_admin_azure_viewer, aws_only):
    body = client.get("/api/v1/auth/me", headers=auth(aws_admin_azure_viewer)).json()
    assert body["cloud_access"]["aws"]["role_code"] == "administrator"
    assert body["cloud_access"]["aws"]["permissions"] == sorted(VM_ALL)
    assert body["cloud_access"]["azure"] == {
        "role_code": "viewer",
        "role_name": "Viewer",
        "permissions": ["vm.read"],
    }

    assert (
        client.get("/api/v1/auth/me", headers=auth(aws_only)).json()["cloud_access"][
            "azure"
        ]
        is None
    )


def request_row(provider: str) -> ProvisioningRequest:
    return ProvisioningRequest(
        created_by_email="someone@example.com",
        original_request="Necesito una VM pequeña para pruebas",
        provider=provider,
        region="us-east-2" if provider == "aws" else "eastus2",
        environment="dev",
        instance_count=1,
        instance_type="t3.micro" if provider == "aws" else "Standard_B1s",
        disk_type="gp3" if provider == "aws" else "Standard_LRS",
        disk_size_gb=20,
        architecture_summary="VM",
        reason="Pruebas",
        confidence=0.9,
        pricing_status="unavailable",
        ai_provider="ollama",
        ai_model="test",
    )


def test_provisioning_requests_follow_create_access(
    client, db_session, aws_admin_azure_viewer, roles
):
    azure_request, aws_request = request_row("azure"), request_row("aws")
    db_session.add_all([azure_request, aws_request])
    db_session.flush()
    headers = auth(aws_admin_azure_viewer)

    listed = client.get("/api/v1/provisioning-requests", headers=headers).json()
    assert [item["provider"] for item in listed] == ["aws"]

    assert (
        client.get(
            f"/api/v1/provisioning-requests/{azure_request.id}", headers=headers
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/provisioning-requests/{azure_request.id}/approve", headers=headers
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v1/provisioning-requests/{aws_request.id}/approve", headers=headers
        ).status_code
        == 200
    )

    # Without vm.create anywhere the whole feature is closed.
    reader = make_user(
        db_session, roles, "reader@example.com", azure="viewer", aws="viewer"
    )
    assert (
        client.get("/api/v1/provisioning-requests", headers=auth(reader)).status_code
        == 403
    )


def test_user_api_assigns_cloud_roles(client, db_session, roles):
    manager_role = make_role("manager", {"user.manage"})
    db_session.add(manager_role)
    db_session.flush()
    manager = User(
        email="manager.cloud@example.com",
        full_name="Manager",
        password_hash=hash_password("unused-password-123"),
        is_active=True,
        role=manager_role,
    )
    db_session.add(manager)
    db_session.flush()

    payload = {
        "email": "new.cloud@example.com",
        "full_name": "New Cloud",
        "role_id": str(roles["platform"].id),
        "azure_role_id": str(roles["viewer"].id),
        "aws_role_id": None,
    }
    created = client.post("/api/v1/users", headers=auth(manager), json=payload)
    assert created.status_code == 201
    body = created.json()
    assert body["azure_role_code"] == "viewer" and body["azure_role_name"] == "Viewer"
    assert body["aws_role_id"] is None and body["aws_role_code"] is None

    # The cloud fields are required: omitting them must not silently drop access.
    missing = {key: value for key, value in payload.items() if key != "aws_role_id"}
    missing["email"] = "other.cloud@example.com"
    assert (
        client.post("/api/v1/users", headers=auth(manager), json=missing).status_code
        == 422
    )

    # Roles without a cloud identity cannot be granted as cloud access.
    no_identity = {
        **payload,
        "email": "fourth.cloud@example.com",
        "azure_role_id": str(roles["platform"].id),
    }
    assert (
        client.post(
            "/api/v1/users", headers=auth(manager), json=no_identity
        ).status_code
        == 422
    )

    unknown = {
        **payload,
        "email": "third.cloud@example.com",
        "aws_role_id": "00000000-0000-0000-0000-000000000000",
    }
    assert (
        client.post("/api/v1/users", headers=auth(manager), json=unknown).status_code
        == 422
    )
