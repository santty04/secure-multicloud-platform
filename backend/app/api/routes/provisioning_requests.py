import uuid
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select

from app.ai.catalog import get_infrastructure_catalog
from app.ai.errors import (
    AIConfigurationError,
    AIInvalidResponseError,
    AIPolicyViolationError,
    AIServiceUnavailableError,
)
from app.api.dependencies import DatabaseSession, require_permission
from app.api.routes.instances import (
    execute_aws_create_action,
    execute_azure_create_action,
)
from app.db.models import User
from app.db.models.operation import Operation
from app.db.models.provisioning_request import ProvisioningRequest
from app.schemas.ai import InfrastructureAdvisorRequest
from app.schemas.managed_instance import (
    AWSInstanceCreateRequest,
    AzureInstanceCreateRequest,
)
from app.schemas.provisioning_request import (
    ProvisioningRequestResponse,
    ProvisioningRequestReviewRequest,
    ProvisioningRequestStatus,
)
from app.services.provisioning_requests import (
    ProvisioningRequestNotFoundError,
    ProvisioningRequestStateError,
    approve_provisioning_request,
    create_provisioning_request_from_advisor,
    get_provisioning_request,
    list_provisioning_requests,
    reject_provisioning_request,
)

router = APIRouter(
    prefix="/provisioning-requests",
    tags=["Provisioning Requests"],
)


CanManageProvisioningRequests = Annotated[
    User,
    Depends(require_permission("vm.create")),
]


def _commit_and_refresh(
    db: DatabaseSession,
    provisioning_request,
) -> None:
    db.commit()
    db.refresh(provisioning_request)


def _raise_not_found(
    exc: ProvisioningRequestNotFoundError,
) -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc),
    ) from exc


def _raise_state_conflict(
    exc: ProvisioningRequestStateError,
) -> None:
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=str(exc),
    ) from exc


@router.post(
    "",
    response_model=ProvisioningRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_provisioning_request(
    payload: InfrastructureAdvisorRequest,
    current_user: CanManageProvisioningRequests,
    db: DatabaseSession,
) -> ProvisioningRequestResponse:
    try:
        provisioning_request = (
            await create_provisioning_request_from_advisor(
                db,
                payload=payload,
                current_user=current_user,
            )
        )

    except AIConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI provider configuration is unavailable.",
        ) from exc

    except AIServiceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI infrastructure advisor is temporarily unavailable.",
        ) from exc

    except AIInvalidResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI infrastructure advisor returned an invalid response.",
        ) from exc

    except AIPolicyViolationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI recommendation violated platform policy.",
        ) from exc

    _commit_and_refresh(
        db,
        provisioning_request,
    )

    return ProvisioningRequestResponse.model_validate(
        provisioning_request,
    )


@router.get(
    "",
    response_model=list[ProvisioningRequestResponse],
    status_code=status.HTTP_200_OK,
)
def read_provisioning_requests(
    current_user: CanManageProvisioningRequests,
    db: DatabaseSession,
    request_status: Annotated[
        ProvisioningRequestStatus | None,
        Query(alias="status"),
    ] = None,
    provider: Annotated[
        Literal["aws", "azure"] | None,
        Query(),
    ] = None,
    limit: Annotated[
        int,
        Query(ge=1, le=500),
    ] = 100,
) -> list[ProvisioningRequestResponse]:
    del current_user

    provisioning_requests = list_provisioning_requests(
        db,
        status=request_status,
        provider=provider,
        limit=limit,
    )

    return [
        ProvisioningRequestResponse.model_validate(item)
        for item in provisioning_requests
    ]


@router.get(
    "/{request_id}",
    response_model=ProvisioningRequestResponse,
    status_code=status.HTTP_200_OK,
)
def read_provisioning_request(
    request_id: uuid.UUID,
    current_user: CanManageProvisioningRequests,
    db: DatabaseSession,
) -> ProvisioningRequestResponse:
    del current_user

    try:
        provisioning_request = get_provisioning_request(
            db,
            request_id=request_id,
        )

    except ProvisioningRequestNotFoundError as exc:
        _raise_not_found(exc)

    return ProvisioningRequestResponse.model_validate(
        provisioning_request,
    )


@router.post(
    "/{request_id}/approve",
    response_model=ProvisioningRequestResponse,
    status_code=status.HTTP_200_OK,
)
def approve_request(
    request_id: uuid.UUID,
    current_user: CanManageProvisioningRequests,
    db: DatabaseSession,
    payload: ProvisioningRequestReviewRequest | None = None,
) -> ProvisioningRequestResponse:
    try:
        provisioning_request = get_provisioning_request(
            db,
            request_id=request_id,
        )

        provisioning_request = approve_provisioning_request(
            db,
            provisioning_request=provisioning_request,
            current_user=current_user,
            note=payload.note if payload else None,
        )

    except ProvisioningRequestNotFoundError as exc:
        _raise_not_found(exc)

    except ProvisioningRequestStateError as exc:
        _raise_state_conflict(exc)

    _commit_and_refresh(
        db,
        provisioning_request,
    )

    return ProvisioningRequestResponse.model_validate(
        provisioning_request,
    )


@router.post(
    "/{request_id}/reject",
    response_model=ProvisioningRequestResponse,
    status_code=status.HTTP_200_OK,
)
def reject_request(
    request_id: uuid.UUID,
    current_user: CanManageProvisioningRequests,
    db: DatabaseSession,
    payload: ProvisioningRequestReviewRequest | None = None,
) -> ProvisioningRequestResponse:
    try:
        provisioning_request = get_provisioning_request(
            db,
            request_id=request_id,
        )

        provisioning_request = reject_provisioning_request(
            db,
            provisioning_request=provisioning_request,
            current_user=current_user,
            note=payload.note if payload else None,
        )

    except ProvisioningRequestNotFoundError as exc:
        _raise_not_found(exc)

    except ProvisioningRequestStateError as exc:
        _raise_state_conflict(exc)

    _commit_and_refresh(
        db,
        provisioning_request,
    )

    return ProvisioningRequestResponse.model_validate(
        provisioning_request,
    )
def _validate_executable_provisioning_request(
    provisioning_request: ProvisioningRequest,
) -> None:
    catalog = get_infrastructure_catalog()

    provider_catalog = catalog.get(
        provisioning_request.provider
    )

    if provider_catalog is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provisioning provider is not currently executable.",
        )

    if provisioning_request.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only approved provisioning requests can be executed.",
        )

    if provisioning_request.environment != "dev":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only dev provisioning requests are currently executable.",
        )

    if provisioning_request.instance_count != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Exactly one instance is supported per provisioning request.",
        )

    if provisioning_request.public_ip:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Public IP provisioning is not allowed.",
        )

    if provisioning_request.region not in provider_catalog["regions"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provisioning region is outside the current catalog.",
        )

    if (
        provisioning_request.instance_type
        not in provider_catalog["instance_types"]
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Instance type is outside the current catalog.",
        )

    if provisioning_request.disk_type not in provider_catalog["disk_types"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Disk type is outside the current catalog.",
        )

    if not (
        provider_catalog["min_disk_size_gb"]
        <= provisioning_request.disk_size_gb
        <= provider_catalog["max_disk_size_gb"]
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Disk size is outside the current catalog.",
        )


@router.post(
    "/{request_id}/execute",
    response_model=ProvisioningRequestResponse,
    status_code=status.HTTP_200_OK,
)
def execute_provisioning_request(
    request_id: uuid.UUID,
    request: Request,
    current_user: CanManageProvisioningRequests,
    db: DatabaseSession,
) -> ProvisioningRequestResponse:
    try:
        provisioning_request = get_provisioning_request(
            db,
            request_id=request_id,
        )
    except ProvisioningRequestNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provisioning request not found.",
        ) from exc

    _validate_executable_provisioning_request(
        provisioning_request
    )

    provisioning_request.status = "executing"
    provisioning_request.execution_started_at = datetime.now(UTC)
    provisioning_request.executed_at = None
    provisioning_request.failure_reason = None

    db.commit()
    db.refresh(provisioning_request)

    original_correlation_id = getattr(
        request.state,
        "correlation_id",
        None,
    )

    request.state.correlation_id = str(
        provisioning_request.correlation_id
    )

    resource_name = (
        f"smp-{provisioning_request.provider}-"
        f"{provisioning_request.id.hex[:8]}"
    )

    try:
        if provisioning_request.provider == "aws":
            result = execute_aws_create_action(
                request=request,
                db=db,
                payload=AWSInstanceCreateRequest(
                    name=resource_name,
                ),
                current_user=current_user,
                instance_type=provisioning_request.instance_type,
                region=provisioning_request.region,
                disk_type=provisioning_request.disk_type,
                disk_size_gb=provisioning_request.disk_size_gb,
            )

        elif provisioning_request.provider == "azure":
            result = execute_azure_create_action(
                request=request,
                db=db,
                payload=AzureInstanceCreateRequest(
                    name=resource_name,
                ),
                current_user=current_user,
                size=provisioning_request.instance_type,
                location=provisioning_request.region,
                disk_type=provisioning_request.disk_type,
                disk_size_gb=provisioning_request.disk_size_gb,
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unsupported provisioning provider.",
            )

        operation = db.scalar(
            select(Operation).where(
                Operation.correlation_id
                == provisioning_request.correlation_id
            )
        )

        if operation is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Provisioning operation could not be located.",
            )

        db.refresh(provisioning_request)

        provisioning_request.status = "executed"
        provisioning_request.operation_id = operation.id
        provisioning_request.managed_resource_id = result.resource_id
        provisioning_request.executed_at = datetime.now(UTC)
        provisioning_request.failure_reason = None

        db.commit()
        db.refresh(provisioning_request)

        return ProvisioningRequestResponse.model_validate(
            provisioning_request
        )

    except HTTPException as exc:
        operation = db.scalar(
            select(Operation).where(
                Operation.correlation_id
                == provisioning_request.correlation_id
            )
        )

        db.refresh(provisioning_request)

        provisioning_request.status = "failed"
        provisioning_request.failure_reason = str(exc.detail)

        if operation is not None:
            provisioning_request.operation_id = operation.id

        db.commit()
        db.refresh(provisioning_request)

        raise

    finally:
        request.state.correlation_id = original_correlation_id
