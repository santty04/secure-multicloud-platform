import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import require_permission
from app.db.models import User
from app.schemas.managed_instance import (
    CloudProvider,
    InstanceActionResponse,
    InstanceSummary,
)


router = APIRouter(
    prefix="/instances",
    tags=["Instances"],
)


CanReadInstances = Annotated[
    User,
    Depends(require_permission("vm.read")),
]

CanStartInstances = Annotated[
    User,
    Depends(require_permission("vm.start")),
]

CanStopInstances = Annotated[
    User,
    Depends(require_permission("vm.stop")),
]

CanDeleteInstances = Annotated[
    User,
    Depends(require_permission("vm.delete")),
]


@router.get(
    "",
    response_model=list[InstanceSummary],
    status_code=status.HTTP_200_OK,
)
def list_instances(
    current_user: CanReadInstances,
) -> list[InstanceSummary]:
    del current_user

    return []


@router.post(
    "/{provider}/{resource_id}/start",
    response_model=InstanceActionResponse,
)
def start_instance(
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanStartInstances,
) -> InstanceActionResponse:
    return InstanceActionResponse(
        resource_id=resource_id,
        provider=provider,
        action="start",
        status="simulated",
        requested_by=current_user.id,
    )


@router.post(
    "/{provider}/{resource_id}/stop",
    response_model=InstanceActionResponse,
)
def stop_instance(
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanStopInstances,
) -> InstanceActionResponse:
    return InstanceActionResponse(
        resource_id=resource_id,
        provider=provider,
        action="stop",
        status="simulated",
        requested_by=current_user.id,
    )


@router.delete(
    "/{provider}/{resource_id}",
    response_model=InstanceActionResponse,
)
def delete_instance(
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanDeleteInstances,
) -> InstanceActionResponse:
    return InstanceActionResponse(
        resource_id=resource_id,
        provider=provider,
        action="delete",
        status="simulated",
        requested_by=current_user.id,
    )
