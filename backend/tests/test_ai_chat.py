import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai import service as ai_service
from app.core.security import create_access_token
from app.db.models import ManagedResource, Permission, Role, User
from app.schemas.ai import AIChatDecision


class FakeChatProvider:
    model = "test-chat-model"

    def __init__(
        self,
        decisions: list[AIChatDecision],
    ) -> None:
        self.decisions = list(decisions)
        self.generate_calls = 0
        self.user_prompts: list[str] = []

    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[AIChatDecision],
    ) -> AIChatDecision:
        assert system_prompt
        assert user_prompt
        assert response_model is AIChatDecision

        self.generate_calls += 1
        self.user_prompts.append(user_prompt)

        if not self.decisions:
            raise AssertionError("No fake AI decision remains.")

        return self.decisions.pop(0)


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(
        subject=str(user.id),
    )

    return {
        "Authorization": f"Bearer {token}",
    }


def create_role(
    *,
    role_code: str,
    permissions: list[Permission],
) -> Role:
    return Role(
        id=uuid.uuid4(),
        code=role_code,
        name=f"{role_code.title()} AI Chat Test",
        description=f"AI chat test role {role_code}",
        permissions=permissions,
    )


def create_uniform_cloud_user(
    db_session: Session,
    *,
    role_code: str,
    permission_codes: set[str],
) -> User:
    permissions = [
        Permission(
            id=uuid.uuid4(),
            code=permission_code,
            description=f"Permission {permission_code}",
        )
        for permission_code in permission_codes
    ]

    role = create_role(
        role_code=role_code,
        permissions=permissions,
    )

    user = User(
        id=uuid.uuid4(),
        email=f"{role_code}-{uuid.uuid4().hex[:8]}@ai-chat.test",
        full_name=f"{role_code.title()} AI Chat User",
        password_hash="not-used-in-ai-chat-tests",
        is_active=True,
        role=role,
        azure_role=role,
        aws_role=role,
    )

    db_session.add(user)
    db_session.flush()

    return user


def create_mixed_cloud_user(
    db_session: Session,
) -> User:
    read_permission = Permission(
        id=uuid.uuid4(),
        code="vm.read",
        description="Permission vm.read",
    )

    start_permission = Permission(
        id=uuid.uuid4(),
        code="vm.start",
        description="Permission vm.start",
    )

    stop_permission = Permission(
        id=uuid.uuid4(),
        code="vm.stop",
        description="Permission vm.stop",
    )

    viewer_role = create_role(
        role_code="viewer",
        permissions=[
            read_permission,
        ],
    )

    operator_role = create_role(
        role_code="operator",
        permissions=[
            read_permission,
            start_permission,
            stop_permission,
        ],
    )

    user = User(
        id=uuid.uuid4(),
        email=f"mixed-{uuid.uuid4().hex[:8]}@ai-chat.test",
        full_name="Mixed Cloud AI Chat User",
        password_hash="not-used-in-ai-chat-tests",
        is_active=True,
        role=viewer_role,
        azure_role=operator_role,
        aws_role=viewer_role,
    )

    db_session.add(user)
    db_session.flush()

    return user


def create_managed_resource(
    db_session: Session,
    *,
    provider: str,
    name: str,
    status: str = "stopped",
) -> ManagedResource:
    region = "centralus" if provider == "azure" else "us-east-2"

    resource = ManagedResource(
        id=uuid.uuid4(),
        provider=provider,
        cloud_resource_id=f"{provider}-{uuid.uuid4()}",
        name=name,
        resource_type="virtual_machine",
        region=region,
        environment="dev",
        status=status,
        is_managed=True,
    )

    db_session.add(resource)
    db_session.flush()

    return resource


def install_fake_provider(
    monkeypatch: pytest.MonkeyPatch,
    provider: FakeChatProvider,
) -> None:
    monkeypatch.setattr(
        ai_service,
        "get_ai_provider",
        lambda ai_provider: provider,
    )


def test_ai_chat_requires_authentication(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/v1/ai/chat",
        json={
            "message": "Muéstrame mis máquinas virtuales.",
        },
    )

    assert response.status_code == 401


def test_viewer_can_list_visible_vms(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    viewer = create_uniform_cloud_user(
        db_session,
        role_code="viewer",
        permission_codes={
            "vm.read",
        },
    )

    azure_resource = create_managed_resource(
        db_session,
        provider="azure",
        name="azure-viewer-vm",
    )

    aws_resource = create_managed_resource(
        db_session,
        provider="aws",
        name="aws-viewer-vm",
        status="running",
    )

    provider = FakeChatProvider(
        [
            AIChatDecision(
                intent="query_inventory",
                message="Voy a mostrar las máquinas visibles.",
                provider=None,
                resource_id=None,
            )
        ]
    )

    install_fake_provider(
        monkeypatch,
        provider,
    )

    response = client.post(
        "/api/v1/ai/chat",
        headers=auth_headers(viewer),
        json={
            "ai_provider": "ollama",
            "message": "Muéstrame mis máquinas virtuales.",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["intent"] == "query_inventory"
    assert body["requires_confirmation"] is False
    assert body["target_action"] is None

    assert azure_resource.name in body["message"]
    assert aws_resource.name in body["message"]

    assert provider.generate_calls == 1


def test_viewer_cannot_stop_vm_from_ai_chat(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    viewer = create_uniform_cloud_user(
        db_session,
        role_code="viewer",
        permission_codes={
            "vm.read",
        },
    )

    resource = create_managed_resource(
        db_session,
        provider="azure",
        name="viewer-stop-target",
        status="running",
    )

    provider = FakeChatProvider(
        [
            AIChatDecision(
                intent="stop_vm",
                message="El usuario quiere apagar la máquina.",
                provider="azure",
                resource_id=resource.id,
            )
        ]
    )

    install_fake_provider(
        monkeypatch,
        provider,
    )

    response = client.post(
        "/api/v1/ai/chat",
        headers=auth_headers(viewer),
        json={
            "message": "Apaga viewer-stop-target.",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["intent"] == "stop_vm"
    assert body["requires_confirmation"] is False
    assert body["target_action"] is None
    assert "No tienes permiso" in body["message"]


def test_operator_receives_stop_confirmation(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    operator = create_uniform_cloud_user(
        db_session,
        role_code="operator",
        permission_codes={
            "vm.read",
            "vm.start",
            "vm.stop",
        },
    )

    resource = create_managed_resource(
        db_session,
        provider="azure",
        name="operator-stop-target",
        status="running",
    )

    provider = FakeChatProvider(
        [
            AIChatDecision(
                intent="stop_vm",
                message="El usuario quiere apagar la máquina.",
                provider="azure",
                resource_id=resource.id,
            )
        ]
    )

    install_fake_provider(
        monkeypatch,
        provider,
    )

    response = client.post(
        "/api/v1/ai/chat",
        headers=auth_headers(operator),
        json={
            "message": "Apaga operator-stop-target.",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["intent"] == "stop_vm"
    assert body["requires_confirmation"] is True

    assert body["target_action"] == {
        "action": "stop",
        "provider": "azure",
        "resource_id": str(resource.id),
        "resource_name": resource.name,
        "current_status": "running",
    }


def test_ai_chat_enforces_per_cloud_rbac(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = create_mixed_cloud_user(
        db_session,
    )

    azure_resource = create_managed_resource(
        db_session,
        provider="azure",
        name="azure-operator-target",
        status="running",
    )

    aws_resource = create_managed_resource(
        db_session,
        provider="aws",
        name="aws-viewer-target",
        status="running",
    )

    provider = FakeChatProvider(
        [
            AIChatDecision(
                intent="stop_vm",
                message="Solicitud para Azure.",
                provider="azure",
                resource_id=azure_resource.id,
            ),
            AIChatDecision(
                intent="stop_vm",
                message="Solicitud para AWS.",
                provider="aws",
                resource_id=aws_resource.id,
            ),
        ]
    )

    install_fake_provider(
        monkeypatch,
        provider,
    )

    azure_response = client.post(
        "/api/v1/ai/chat",
        headers=auth_headers(user),
        json={
            "message": "Apaga azure-operator-target.",
        },
    )

    assert azure_response.status_code == 200

    azure_body = azure_response.json()

    assert azure_body["requires_confirmation"] is True
    assert azure_body["target_action"]["provider"] == "azure"
    assert azure_body["target_action"]["resource_id"] == str(azure_resource.id)

    aws_response = client.post(
        "/api/v1/ai/chat",
        headers=auth_headers(user),
        json={
            "message": "Apaga aws-viewer-target.",
        },
    )

    assert aws_response.status_code == 200

    aws_body = aws_response.json()

    assert aws_body["intent"] == "stop_vm"
    assert aws_body["requires_confirmation"] is False
    assert aws_body["target_action"] is None
    assert "No tienes permiso" in aws_body["message"]


def test_ai_cannot_target_unknown_resource_id(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    viewer = create_uniform_cloud_user(
        db_session,
        role_code="viewer",
        permission_codes={
            "vm.read",
        },
    )

    create_managed_resource(
        db_session,
        provider="azure",
        name="known-vm",
    )

    invented_resource_id = uuid.uuid4()

    provider = FakeChatProvider(
        [
            AIChatDecision(
                intent="get_vm_status",
                message="Consulta de estado.",
                provider="azure",
                resource_id=invented_resource_id,
            )
        ]
    )

    install_fake_provider(
        monkeypatch,
        provider,
    )

    response = client.post(
        "/api/v1/ai/chat",
        headers=auth_headers(viewer),
        json={
            "message": "Dime el estado de una máquina.",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["intent"] == "clarification"
    assert body["requires_confirmation"] is False
    assert body["target_action"] is None
