import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.catalog import get_infrastructure_catalog
from app.ai.errors import AIPolicyViolationError
from app.ai.factory import get_ai_provider
from app.ai.service import (
    generate_infrastructure_recommendation,
    validate_recommendation_policy,
)
from app.db.models.provisioning_request import ProvisioningRequest
from app.db.models.user import User
from app.schemas.ai import (
    InfrastructureAdvisorRequest,
    InfrastructureRecommendation,
)
from app.schemas.provisioning_request import ProvisioningRequestStatus


class ProvisioningRequestNotFoundError(RuntimeError):
    """Raised when a provisioning request does not exist."""


class ProvisioningRequestStateError(RuntimeError):
    """Raised when an invalid provisioning state transition is attempted."""


def _build_catalog_default_recommendation(
    payload: InfrastructureAdvisorRequest,
) -> InfrastructureRecommendation:
    provider_name = payload.provider_preference

    if provider_name is None:
        raise AIPolicyViolationError(
            "Catalog-default provisioning requires an explicit provider."
        )

    catalog = get_infrastructure_catalog()
    provider_catalog = catalog.get(provider_name)

    if provider_catalog is None:
        raise AIPolicyViolationError(
            "Catalog-default provisioning selected an unsupported provider."
        )

    provider_label = "AWS" if provider_name == "aws" else "Azure"

    recommendation = InfrastructureRecommendation(
        provider=provider_name,
        requested_name=payload.requested_name,
        region=provider_catalog["regions"][0],
        environment=payload.environment,
        instance_count=1,
        instance_type=provider_catalog["instance_types"][0],
        disk_type=provider_catalog["disk_types"][0],
        disk_size_gb=provider_catalog["min_disk_size_gb"],
        public_ip=False,
        architecture_summary=(
            f"Máquina virtual privada de desarrollo en {provider_label} "
            "usando la configuración m?nima permitida por el catálogo "
            "seguro de la plataforma."
        ),
        reason=(
            "Solicitud preparada desde el Asistente Multicloud usando "
            "valores seguros predeterminados del catálogo de la plataforma."
        ),
        assumptions=[
            (
                "Cuando el usuario no especifica capacidad adicional, "
                "se utilizan los recursos mínimos permitidos por el catálogo."
            ),
        ],
        risks=[
            (
                "La disponibilidad real del tipo de instancia se valida "
                "con el proveedor durante la ejecución."
            ),
        ],
        confidence=1.0,
    )

    validate_recommendation_policy(
        recommendation,
        payload,
    )

    return recommendation


async def create_provisioning_request_from_advisor(
    db: Session,
    *,
    payload: InfrastructureAdvisorRequest,
    current_user: User,
) -> ProvisioningRequest:
    if payload.use_catalog_defaults:
        recommendation = _build_catalog_default_recommendation(
            payload,
        )

        ai_provider = payload.ai_provider
        ai_model = get_ai_provider(
            payload.ai_provider,
        ).model
        estimated_monthly_cost_usd = None
        pricing_status = "not_configured"

    else:
        advisor_response = await generate_infrastructure_recommendation(
            payload,
        )

        recommendation = advisor_response.recommendation
        ai_provider = advisor_response.ai_provider
        ai_model = advisor_response.ai_model
        estimated_monthly_cost_usd = (
            advisor_response.estimated_monthly_cost_usd
        )
        pricing_status = advisor_response.pricing_status

    provisioning_request = ProvisioningRequest(
        correlation_id=uuid.uuid4(),
        status="pending",
        created_by_id=current_user.id,
        created_by_email=current_user.email,
        original_request=payload.request,
        requested_name=recommendation.requested_name,
        provider_preference=payload.provider_preference,
        max_monthly_budget_usd=payload.max_monthly_budget_usd,
        provider=recommendation.provider,
        region=recommendation.region,
        environment=recommendation.environment,
        instance_count=recommendation.instance_count,
        instance_type=recommendation.instance_type,
        disk_type=recommendation.disk_type,
        disk_size_gb=recommendation.disk_size_gb,
        public_ip=recommendation.public_ip,
        architecture_summary=recommendation.architecture_summary,
        reason=recommendation.reason,
        assumptions=recommendation.assumptions,
        risks=recommendation.risks,
        confidence=recommendation.confidence,
        estimated_monthly_cost_usd=estimated_monthly_cost_usd,
        pricing_status=pricing_status,
        ai_provider=ai_provider,
        ai_model=ai_model,
    )

    db.add(provisioning_request)
    db.flush()

    return provisioning_request


def get_provisioning_request(
    db: Session,
    *,
    request_id: uuid.UUID,
) -> ProvisioningRequest:
    provisioning_request = db.get(
        ProvisioningRequest,
        request_id,
    )

    if provisioning_request is None:
        raise ProvisioningRequestNotFoundError("Provisioning request was not found.")

    return provisioning_request


def list_provisioning_requests(
    db: Session,
    *,
    status: ProvisioningRequestStatus | None = None,
    provider: str | None = None,
    providers: list[str] | None = None,
    limit: int = 100,
) -> list[ProvisioningRequest]:
    statement = select(ProvisioningRequest)

    if providers is not None:
        statement = statement.where(ProvisioningRequest.provider.in_(providers))

    if status is not None:
        statement = statement.where(
            ProvisioningRequest.status == status,
        )

    if provider is not None:
        statement = statement.where(
            ProvisioningRequest.provider == provider,
        )

    statement = statement.order_by(
        ProvisioningRequest.created_at.desc(),
    ).limit(limit)

    return list(db.scalars(statement).all())


def approve_provisioning_request(
    db: Session,
    *,
    provisioning_request: ProvisioningRequest,
    current_user: User,
    note: str | None = None,
) -> ProvisioningRequest:
    if provisioning_request.status != "pending":
        raise ProvisioningRequestStateError(
            "Only pending provisioning requests can be approved."
        )

    provisioning_request.status = "approved"
    provisioning_request.reviewed_by_id = current_user.id
    provisioning_request.reviewed_by_email = current_user.email
    provisioning_request.review_note = note
    provisioning_request.approved_at = datetime.now(UTC)
    provisioning_request.rejected_at = None
    provisioning_request.failure_reason = None

    db.flush()

    return provisioning_request


def reject_provisioning_request(
    db: Session,
    *,
    provisioning_request: ProvisioningRequest,
    current_user: User,
    note: str | None = None,
) -> ProvisioningRequest:
    if provisioning_request.status != "pending":
        raise ProvisioningRequestStateError(
            "Only pending provisioning requests can be rejected."
        )

    provisioning_request.status = "rejected"
    provisioning_request.reviewed_by_id = current_user.id
    provisioning_request.reviewed_by_email = current_user.email
    provisioning_request.review_note = note
    provisioning_request.rejected_at = datetime.now(UTC)
    provisioning_request.approved_at = None
    provisioning_request.failure_reason = None

    db.flush()

    return provisioning_request
