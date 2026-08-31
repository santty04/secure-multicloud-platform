import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.api.dependencies import (
    DatabaseSession,
    require_permission,
)
from app.cloud.aws.ec2 import (
    get_instance_state as get_aws_instance_state,
)
from app.cloud.aws.ec2 import (
    list_instances as list_aws_instances,
)
from app.cloud.aws.ec2 import (
    start_instance as start_aws_instance,
)
from app.cloud.aws.ec2 import (
    stop_instance as stop_aws_instance,
)
from app.cloud.aws.errors import AWSCloudError
from app.cloud.azure.compute import (
    get_virtual_machine_power_state,
    start_virtual_machine,
    stop_virtual_machine,
)
from app.core.config import settings
from app.db.models import ManagedResource, User
from app.schemas.managed_instance import (
    AWSInstanceSummary,
    CloudProvider,
    InstanceActionResponse,
    InstanceStatusResponse,
    InstanceSummary,
)
from app.services.audit import create_audit_log
from app.services.operations import (
    create_operation,
    mark_operation_failed,
    mark_operation_success,
)

router = APIRouter(
    prefix="/instances",
    tags=["Instances"],
)


# ============================================================
# RBAC DEPENDENCIES
# ============================================================

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


# ============================================================
# MANAGED RESOURCE HELPERS
# ============================================================


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
# SIMULATED ACTIONS
# ============================================================


def execute_simulated_action(
    *,
    request: Request,
    db: DatabaseSession,
    resource: ManagedResource,
    provider: CloudProvider,
    action: str,
    required_permission: str,
    current_user: User,
) -> InstanceActionResponse:
    correlation_id = uuid.UUID(
        request.state.correlation_id,
    )

    operation = create_operation(
        db,
        correlation_id=correlation_id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=provider.value,
        action=action,
        required_permission=required_permission,
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=provider.value,
        action=action,
        decision="allowed",
        reason_code="permission_granted",
        required_permission=required_permission,
        role_code=current_user.role.code,
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "simulated",
        },
    )

    mark_operation_success(
        db,
        operation=operation,
        result_summary={
            "execution_mode": "simulated",
            "resource_name": resource.name,
        },
    )

    db.commit()

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=provider,
        action=action,
        status="simulated",
        requested_by=current_user.id,
    )


# ============================================================
# AZURE START
# ============================================================


def execute_azure_start_action(
    *,
    request: Request,
    db: DatabaseSession,
    resource: ManagedResource,
    current_user: User,
) -> InstanceActionResponse:
    correlation_id = uuid.UUID(
        request.state.correlation_id,
    )

    operation = create_operation(
        db,
        correlation_id=correlation_id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AZURE.value,
        action="start",
        required_permission="vm.start",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AZURE.value,
        action="start",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.start",
        role_code=current_user.role.code,
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "azure",
        },
    )

    try:
        start_virtual_machine(
            resource.cloud_resource_id,
            current_user.role.code,
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "azure",
                "resource_name": resource.name,
            },
        )

        db.commit()

    except Exception as exc:
        mark_operation_failed(
            db,
            operation=operation,
            error_code="azure_start_failed",
            error_message=str(exc),
            result_summary={
                "execution_mode": "azure",
                "resource_name": resource.name,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=resource.id,
            provider=CloudProvider.AZURE.value,
            action="start",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.start",
            role_code=current_user.role.code,
            event_type="operation_failure",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "execution_mode": "azure",
                "error_type": type(exc).__name__,
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Azure virtual machine start operation failed.",
        ) from exc

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=CloudProvider.AZURE,
        action="start",
        status="success",
        requested_by=current_user.id,
    )


# ============================================================
# AWS START
# ============================================================


def execute_aws_start_action(
    *,
    request: Request,
    db: DatabaseSession,
    resource: ManagedResource,
    current_user: User,
) -> InstanceActionResponse:
    correlation_id = uuid.UUID(
        request.state.correlation_id,
    )

    operation = create_operation(
        db,
        correlation_id=correlation_id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AWS.value,
        action="start",
        required_permission="vm.start",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AWS.value,
        action="start",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.start",
        role_code=current_user.role.code,
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "aws",
        },
    )

    try:
        start_aws_instance(
            resource.cloud_resource_id,
            current_user.role.code,
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "aws",
                "resource_name": resource.name,
            },
        )

        db.commit()

    except AWSCloudError as exc:
        mark_operation_failed(
            db,
            operation=operation,
            error_code=exc.code,
            error_message=exc.message,
            result_summary={
                "execution_mode": "aws",
                "resource_name": resource.name,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=resource.id,
            provider=CloudProvider.AWS.value,
            action="start",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.start",
            role_code=current_user.role.code,
            event_type="operation_failure",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "execution_mode": "aws",
                "error_type": type(exc).__name__,
                "error_code": exc.code,
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AWS EC2 instance start operation failed.",
        ) from exc

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=CloudProvider.AWS,
        action="start",
        status="success",
        requested_by=current_user.id,
    )


# ============================================================
# AZURE STOP
# ============================================================


def execute_azure_stop_action(
    *,
    request: Request,
    db: DatabaseSession,
    resource: ManagedResource,
    current_user: User,
) -> InstanceActionResponse:
    correlation_id = uuid.UUID(
        request.state.correlation_id,
    )

    operation = create_operation(
        db,
        correlation_id=correlation_id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AZURE.value,
        action="stop",
        required_permission="vm.stop",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AZURE.value,
        action="stop",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.stop",
        role_code=current_user.role.code,
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "azure",
        },
    )

    try:
        stop_virtual_machine(
            resource.cloud_resource_id,
            current_user.role.code,
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "azure",
                "resource_name": resource.name,
            },
        )

        db.commit()

    except Exception as exc:
        mark_operation_failed(
            db,
            operation=operation,
            error_code="azure_stop_failed",
            error_message=str(exc),
            result_summary={
                "execution_mode": "azure",
                "resource_name": resource.name,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=resource.id,
            provider=CloudProvider.AZURE.value,
            action="stop",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.stop",
            role_code=current_user.role.code,
            event_type="operation_failure",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "execution_mode": "azure",
                "error_type": type(exc).__name__,
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Azure virtual machine stop operation failed.",
        ) from exc

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=CloudProvider.AZURE,
        action="stop",
        status="success",
        requested_by=current_user.id,
    )


# ============================================================
# AWS STOP
# ============================================================


def execute_aws_stop_action(
    *,
    request: Request,
    db: DatabaseSession,
    resource: ManagedResource,
    current_user: User,
) -> InstanceActionResponse:
    correlation_id = uuid.UUID(
        request.state.correlation_id,
    )

    operation = create_operation(
        db,
        correlation_id=correlation_id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AWS.value,
        action="stop",
        required_permission="vm.stop",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AWS.value,
        action="stop",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.stop",
        role_code=current_user.role.code,
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "aws",
        },
    )

    try:
        stop_aws_instance(
            resource.cloud_resource_id,
            current_user.role.code,
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "aws",
                "resource_name": resource.name,
            },
        )

        db.commit()

    except AWSCloudError as exc:
        mark_operation_failed(
            db,
            operation=operation,
            error_code=exc.code,
            error_message=exc.message,
            result_summary={
                "execution_mode": "aws",
                "resource_name": resource.name,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=resource.id,
            provider=CloudProvider.AWS.value,
            action="stop",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.stop",
            role_code=current_user.role.code,
            event_type="operation_failure",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "execution_mode": "aws",
                "error_type": type(exc).__name__,
                "error_code": exc.code,
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AWS EC2 instance stop operation failed.",
        ) from exc

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=CloudProvider.AWS,
        action="stop",
        status="success",
        requested_by=current_user.id,
    )


# ============================================================
# LIST MANAGED INSTANCES
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

    try:
        return list_aws_instances(
            current_user.role.code,
        )

    except AWSCloudError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AWS EC2 inventory lookup failed.",
        ) from exc


# ============================================================
# REAL-TIME INSTANCE STATUS
# ============================================================


@router.get(
    "/{provider}/{resource_id}/status",
    response_model=InstanceStatusResponse,
    status_code=status.HTTP_200_OK,
)
def get_instance_status(
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanReadInstances,
    db: DatabaseSession,
) -> InstanceStatusResponse:
    resource = get_managed_resource(
        db,
        provider,
        resource_id,
    )

    if provider is CloudProvider.AZURE:
        real_status = get_virtual_machine_power_state(
            resource.cloud_resource_id,
            current_user.role.code,
        )

    elif provider is CloudProvider.AWS:
        try:
            real_status = get_aws_instance_state(
                resource.cloud_resource_id,
                current_user.role.code,
            )

        except AWSCloudError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AWS EC2 instance status lookup failed.",
            ) from exc

        if real_status is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AWS EC2 instance not found or not managed by the platform.",
            )

    return InstanceStatusResponse(
        resource_id=resource.id,
        provider=provider,
        name=resource.name,
        status=real_status,
    )


# ============================================================
# START INSTANCE
# ============================================================


@router.post(
    "/{provider}/{resource_id}/start",
    response_model=InstanceActionResponse,
)
def start_instance(
    request: Request,
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanStartInstances,
    db: DatabaseSession,
) -> InstanceActionResponse:
    resource = get_managed_resource(
        db,
        provider,
        resource_id,
    )

    if provider is CloudProvider.AZURE and settings.azure_write_enabled:
        return execute_azure_start_action(
            request=request,
            db=db,
            resource=resource,
            current_user=current_user,
        )

    if provider is CloudProvider.AWS and settings.aws_write_enabled:
        return execute_aws_start_action(
            request=request,
            db=db,
            resource=resource,
            current_user=current_user,
        )

    return execute_simulated_action(
        request=request,
        db=db,
        resource=resource,
        provider=provider,
        action="start",
        required_permission="vm.start",
        current_user=current_user,
    )


# ============================================================
# STOP INSTANCE
# ============================================================


@router.post(
    "/{provider}/{resource_id}/stop",
    response_model=InstanceActionResponse,
)
def stop_instance(
    request: Request,
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanStopInstances,
    db: DatabaseSession,
) -> InstanceActionResponse:
    resource = get_managed_resource(
        db,
        provider,
        resource_id,
    )

    if provider is CloudProvider.AZURE and settings.azure_write_enabled:
        return execute_azure_stop_action(
            request=request,
            db=db,
            resource=resource,
            current_user=current_user,
        )

    if provider is CloudProvider.AWS and settings.aws_write_enabled:
        return execute_aws_stop_action(
            request=request,
            db=db,
            resource=resource,
            current_user=current_user,
        )

    return execute_simulated_action(
        request=request,
        db=db,
        resource=resource,
        provider=provider,
        action="stop",
        required_permission="vm.stop",
        current_user=current_user,
    )


# ============================================================
# DELETE INSTANCE
# ============================================================


@router.delete(
    "/{provider}/{resource_id}",
    response_model=InstanceActionResponse,
)
def delete_instance(
    request: Request,
    provider: CloudProvider,
    resource_id: uuid.UUID,
    current_user: CanDeleteInstances,
    db: DatabaseSession,
) -> InstanceActionResponse:
    resource = get_managed_resource(
        db,
        provider,
        resource_id,
    )

    return execute_simulated_action(
        request=request,
        db=db,
        resource=resource,
        provider=provider,
        action="delete",
        required_permission="vm.delete",
        current_user=current_user,
    )
