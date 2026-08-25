import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.dependencies import (
    DatabaseSession,
    require_permission,
)
from app.cloud.aws.ec2 import list_instances as list_aws_instances
from app.db.models import ManagedResource, User
from app.schemas.managed_instance import (
    AWSInstanceSummary,
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


def get_managed_resource(
    db: DatabaseSession,
    provider: CloudProvider,
    resource_id: uuid.UUID,
) -> ManagedResource:
    statement = select(ManagedResource).where(
        ManagedResource.id == resource_id,
        ManagedResource.provider == provider.value,
        ManagedResource.is_managed.is_(True),
    )

    resource = db.scalar(statement)

    if resource is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        )

    return resource


# ============================================================
# MANAGED INSTANCES
# ============================================================


@router.get(
    "",
    response_model=list[InstanceSummary],
    status_code=status.HTTP_200_OK,
)
def list_instances(
    current_user: CanReadInstances,
    db: DatabaseSession,
) -> list[ManagedResource]:
    del current_user

    statement = (
        select(ManagedResource)
        .where(ManagedResource.is_managed.is_(True))
        .order_by(
            ManagedResource.provider,
            ManagedResource.name,
        )
    )

    return list(db.scalars(statement).all())


# ============================================================
# AWS LIVE INVENTORY
# ============================================================


@router.get(
    "/aws/live",
    response_model=list[AWSInstanceSummary],
    status_code=status.HTTP_200_OK,
)
def list_live_aws_instances(
    current_user: CanReadInstances,
) -> list[dict[str, str | None]]:
    """
    Return the current AWS EC2 inventory visible to the authenticated
    application role.

    The application permission vm.read is checked before reaching AWS.
    The backend then assumes the corresponding AWS IAM role through STS.
    """

    return list_aws_instances(
        current_user.role.code,
    )


# ============================================================
# START INSTANCE
# ============================================================


@router.post(
    "/{provider}/{resource_id}/start",
    response_model=InstanceActionResponse,
)
def start_instance(
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanStartInstances,
    db: DatabaseSession,
) -> InstanceActionResponse:
    get_managed_resource(db, provider, resource_id)

    return InstanceActionResponse(
        resource_id=resource_id,
        provider=provider,
        action="start",
        status="simulated",
        requested_by=current_user.id,
    )


# ============================================================
# STOP INSTANCE
# ============================================================


@router.post(
    "/{provider}/{resource_id}/stop",
    response_model=InstanceActionResponse,
)
def stop_instance(
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanStopInstances,
    db: DatabaseSession,
) -> InstanceActionResponse:
    get_managed_resource(db, provider, resource_id)

    return InstanceActionResponse(
        resource_id=resource_id,
        provider=provider,
        action="stop",
        status="simulated",
        requested_by=current_user.id,
    )


# ============================================================
# DELETE INSTANCE
# ============================================================


@router.delete(
    "/{provider}/{resource_id}",
    response_model=InstanceActionResponse,
)
def delete_instance(
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanDeleteInstances,
    db: DatabaseSession,
) -> InstanceActionResponse:
    get_managed_resource(db, provider, resource_id)

    return InstanceActionResponse(
        resource_id=resource_id,
        provider=provider,
        action="delete",
        status="simulated",
        requested_by=current_user.id,
    )
