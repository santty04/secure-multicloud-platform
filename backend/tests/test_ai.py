import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai import service as ai_service
from app.ai.errors import AIPolicyViolationError
from app.ai.service import validate_recommendation_policy
from app.api.routes import ai as ai_routes
from app.core.security import create_access_token
from app.db.models import Permission, Role, User
from app.schemas.ai import (
    InfrastructureAdvisorRequest,
    InfrastructureRecommendation,
)


class FakeProvider:
    model = "test-model"

    def __init__(
        self,
        recommendation: InfrastructureRecommendation,
        *,
        available: bool = True,
    ) -> None:
        self.recommendation = recommendation
        self.available = available
        self.health_calls = 0
        self.generate_calls = 0

    async def health_check(self) -> bool:
        self.health_calls += 1
        return self.available

    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[InfrastructureRecommendation],
    ) -> InfrastructureRecommendation:
        assert system_prompt
        assert user_prompt
        assert response_model is InfrastructureRecommendation

        self.generate_calls += 1

        return self.recommendation


def create_test_user(
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

    role = Role(
        id=uuid.uuid4(),
        code=role_code,
        name=f"{role_code.title()} AI Test",
        description=f"Role {role_code}",
        permissions=permissions,
    )

    user = User(
        id=uuid.uuid4(),
        email=f"{role_code}-ai@example.com",
        full_name=f"{role_code.title()} AI User",
        password_hash="not-used-in-ai-tests",
        is_active=True,
        role=role,
        azure_role=role,
        aws_role=role,
    )

    db_session.add(user)
    db_session.flush()

    return user


def auth_headers(user: User) -> dict[str, str]:
    token = create_access_token(
        subject=str(user.id),
    )

    return {
        "Authorization": f"Bearer {token}",
    }


def valid_aws_recommendation() -> InfrastructureRecommendation:
    return InfrastructureRecommendation(
        provider="aws",
        region="us-east-2",
        environment="dev",
        instance_count=1,
        instance_type="t3.micro",
        disk_type="gp3",
        disk_size_gb=8,
        public_ip=False,
        architecture_summary=(
            "Private development virtual machine using the minimum "
            "necessary resources."
        ),
        reason=(
            "The recommendation uses an allowed AWS instance type, "
            "private networking and basic storage."
        ),
        assumptions=[],
        risks=[],
        confidence=0.98,
    )


def test_ai_health_requires_authentication(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v1/ai/health",
    )

    assert response.status_code == 401


@pytest.mark.parametrize(
    ("role_code", "permission_codes"),
    [
        (
            "viewer",
            {
                "vm.read",
                "operation.read",
            },
        ),
        (
            "operator",
            {
                "vm.read",
                "vm.start",
                "vm.stop",
                "operation.read",
            },
        ),
    ],
)
def test_non_admin_roles_cannot_access_ai(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
    role_code: str,
    permission_codes: set[str],
) -> None:
    user = create_test_user(
        db_session,
        role_code=role_code,
        permission_codes=permission_codes,
    )

    def fail_if_provider_is_called() -> None:
        raise AssertionError(
            "AI provider must not be called when RBAC denies access."
        )

    monkeypatch.setattr(
        ai_routes,
        "get_ai_provider",
        fail_if_provider_is_called,
    )

    response = client.get(
        "/api/v1/ai/health",
        headers=auth_headers(user),
    )

    assert response.status_code == 403


def test_administrator_can_access_ai_health(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    administrator = create_test_user(
        db_session,
        role_code="administrator",
        permission_codes={
            "vm.create",
        },
    )

    provider = FakeProvider(
        valid_aws_recommendation(),
    )

    monkeypatch.setattr(
        ai_routes,
        "get_ai_provider",
        lambda: provider,
    )

    response = client.get(
        "/api/v1/ai/health",
        headers=auth_headers(administrator),
    )

    assert response.status_code == 200

    body = response.json()

    assert body["available"] is True
    assert provider.health_calls == 1


def test_administrator_can_request_ai_recommendation(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    administrator = create_test_user(
        db_session,
        role_code="administrator",
        permission_codes={
            "vm.create",
        },
    )

    provider = FakeProvider(
        valid_aws_recommendation(),
    )

    monkeypatch.setattr(
        ai_service,
        "get_ai_provider",
        lambda ai_provider: provider,
    )

    response = client.post(
        "/api/v1/ai/infrastructure-advisor",
        headers=auth_headers(administrator),
        json={
            "request": (
                "Necesito una maquina virtual economica en AWS "
                "para desarrollo y sin direccion IP publica."
            ),
            "provider_preference": "aws",
            "environment": "dev",
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["recommendation"]["provider"] == "aws"
    assert body["recommendation"]["region"] == "us-east-2"
    assert body["recommendation"]["instance_type"] == "t3.micro"
    assert body["recommendation"]["disk_type"] == "gp3"
    assert body["recommendation"]["public_ip"] is False

    assert body["estimated_monthly_cost_usd"] is None
    assert body["pricing_status"] == "not_configured"
    assert body["executable"] is False

    assert provider.generate_calls == 1


def test_advisor_rejects_resource_outside_catalog(
    client: TestClient,
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    administrator = create_test_user(
        db_session,
        role_code="administrator",
        permission_codes={
            "vm.create",
        },
    )

    invalid_recommendation = valid_aws_recommendation().model_copy(
        update={
            "instance_type": "m5.large",
        },
    )

    provider = FakeProvider(
        invalid_recommendation,
    )

    monkeypatch.setattr(
        ai_service,
        "get_ai_provider",
        lambda ai_provider: provider,
    )

    response = client.post(
        "/api/v1/ai/infrastructure-advisor",
        headers=auth_headers(administrator),
        json={
            "request": (
                "Necesito una maquina virtual privada en AWS "
                "para un entorno de desarrollo."
            ),
            "provider_preference": "aws",
            "environment": "dev",
        },
    )

    assert response.status_code == 502
    assert provider.generate_calls == 1


def test_policy_rejects_public_ip() -> None:
    request = InfrastructureAdvisorRequest(
        request=(
            "Necesito una maquina virtual privada en AWS "
            "para desarrollo."
        ),
        provider_preference="aws",
        environment="dev",
    )

    recommendation = valid_aws_recommendation().model_copy(
        update={
            "public_ip": True,
        },
    )

    with pytest.raises(
        AIPolicyViolationError,
        match="public IP",
    ):
        validate_recommendation_policy(
            recommendation,
            request,
        )
