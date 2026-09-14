import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.ai.errors import (
    AIConfigurationError,
    AIInvalidResponseError,
    AIPolicyViolationError,
    AIServiceUnavailableError,
)
from app.api.dependencies import DatabaseSession, require_permission
from app.db.models import User
from app.schemas.ai import InfrastructureAdvisorRequest
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
