import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import (
    CLOUD_PROVIDERS,
    CurrentUser,
    DatabaseSession,
    cloud_role_code,
    has_cloud_permission,
    require_cloud_permission,
)
from app.cloud.aws.ec2 import (
    create_instance as create_aws_instance,
)
from app.cloud.aws.ec2 import (
    get_instance_state as get_aws_instance_state,
)
from app.cloud.aws.ec2 import (
    get_instance_state_by_id as get_aws_instance_state_by_id,
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
from app.cloud.aws.ec2 import (
    terminate_instance as terminate_aws_instance,
)
from app.cloud.aws.errors import AWSCloudError
from app.cloud.azure.compute import (
    create_virtual_machine,
    delete_virtual_machine,
    get_virtual_machine_power_state,
    start_virtual_machine,
    stop_virtual_machine,
)
from app.core.config import settings
from app.db.models import ManagedResource, User
from app.schemas.managed_instance import (
    AWSInstanceCreateRequest,
    AWSInstanceCreateResponse,
    AWSInstanceSummary,
    AzureInstanceCreateRequest,
    AzureInstanceCreateResponse,
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

logger = logging.getLogger(__name__)


# ============================================================
# RBAC DEPENDENCIES
# ============================================================

# VM permissions come from the caller's role in the target cloud, not from
# the platform role. Routes with a `{provider}` path parameter resolve it at
# request time; provider-specific routes pin it.
CanCreateAwsInstances = Annotated[
    User,
    Depends(require_cloud_permission("vm.create", "aws")),
]

CanCreateAzureInstances = Annotated[
    User,
    Depends(require_cloud_permission("vm.create", "azure")),
]

CanReadAwsInventory = Annotated[
    User,
    Depends(require_cloud_permission("vm.read", "aws")),
]

CanReadInstances = Annotated[
    User,
    Depends(require_cloud_permission("vm.read")),
]

CanStartInstances = Annotated[
    User,
    Depends(require_cloud_permission("vm.start")),
]

CanStopInstances = Annotated[
    User,
    Depends(require_cloud_permission("vm.stop")),
]

CanDeleteInstances = Annotated[
    User,
    Depends(require_cloud_permission("vm.delete")),
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


def register_aws_managed_resource(
    *,
    db: DatabaseSession,
    cloud_resource_id: str,
    name: str,
    current_user: User,
) -> ManagedResource:
    resource = ManagedResource(
        provider=CloudProvider.AWS.value,
        cloud_resource_id=cloud_resource_id,
        name=name,
        resource_type="virtual_machine",
        region=settings.aws_region,
        environment="dev",
        status="pending",
        is_managed=True,
        registered_by_id=current_user.id,
    )

    db.add(resource)
    db.flush()

    return resource


def register_azure_managed_resource(
    *,
    db: DatabaseSession,
    cloud_resource_id: str,
    name: str,
    location: str,
    current_user: User,
) -> ManagedResource:
    resource = ManagedResource(
        provider=CloudProvider.AZURE.value,
        cloud_resource_id=cloud_resource_id,
        name=name,
        resource_type="virtual_machine",
        region=location,
        environment="dev",
        status="pending",
        is_managed=True,
        registered_by_id=current_user.id,
    )

    db.add(resource)
    db.flush()

    return resource


def mark_resource_deleted(resource: ManagedResource) -> None:
    resource.is_managed = False
    resource.status = "terminated"


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
        role_code=cloud_role_code(current_user, provider.value),
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

    if action == "delete":
        mark_resource_deleted(resource)
    elif action == "start":
        resource.status = "running"
    elif action == "stop":
        resource.status = "stopped"

    db.commit()

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=provider,
        action=action,
        status="simulated",
        requested_by=current_user.id,
    )


# ============================================================
# AWS CREATE
# ============================================================


def execute_aws_create_action(
    *,
    request: Request,
    db: DatabaseSession,
    payload: AWSInstanceCreateRequest,
    current_user: User,
    instance_type: str | None = None,
    region: str | None = None,
    disk_type: str | None = None,
    disk_size_gb: int | None = None,
) -> AWSInstanceCreateResponse:
    correlation_id = uuid.UUID(
        request.state.correlation_id,
    )

    operation = create_operation(
        db,
        correlation_id=correlation_id,
        user_id=current_user.id,
        resource_id=None,
        provider=CloudProvider.AWS.value,
        action="create",
        required_permission="vm.create",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=None,
        provider=CloudProvider.AWS.value,
        action="create",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.create",
        role_code=cloud_role_code(current_user, "aws"),
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "aws",
            "resource_name": payload.name,
        },
    )

    if not settings.aws_write_enabled:
        mark_operation_failed(
            db,
            operation=operation,
            error_code="aws_write_disabled",
            error_message="AWS write operations are disabled.",
            result_summary={
                "execution_mode": "disabled",
                "resource_name": payload.name,
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AWS write operations are disabled.",
        )

    db.commit()

    try:
        create_kwargs: dict[str, str | int] = {
            "name": payload.name,
            "role_code": cloud_role_code(current_user, "aws"),
            "client_token": str(correlation_id),
        }

        if instance_type is not None:
            create_kwargs["instance_type"] = instance_type

        if region is not None:
            create_kwargs["region"] = region

        if disk_type is not None:
            create_kwargs["volume_type"] = disk_type

        if disk_size_gb is not None:
            create_kwargs["root_volume_size_gb"] = disk_size_gb

        instance_id = create_aws_instance(
            **create_kwargs,
        )

    except AWSCloudError as exc:
        mark_operation_failed(
            db,
            operation=operation,
            error_code=exc.code,
            error_message=exc.message,
            result_summary={
                "execution_mode": "aws",
                "resource_name": payload.name,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=None,
            provider=CloudProvider.AWS.value,
            action="create",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.create",
            role_code=cloud_role_code(current_user, "aws"),
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

        if exc.code == "aws_configuration_error":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AWS EC2 instance creation is unavailable.",
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AWS EC2 instance create operation failed.",
        ) from exc

    try:
        resource = register_aws_managed_resource(
            db=db,
            cloud_resource_id=instance_id,
            name=payload.name,
            current_user=current_user,
        )

        operation.resource_id = resource.id

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "aws",
                "resource_name": payload.name,
                "cloud_resource_id": instance_id,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=resource.id,
            provider=CloudProvider.AWS.value,
            action="create",
            decision="allowed",
            reason_code="cloud_operation_succeeded",
            required_permission="vm.create",
            role_code=cloud_role_code(current_user, "aws"),
            event_type="operation_success",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "execution_mode": "aws",
                "cloud_resource_id": instance_id,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        cleanup_requested = False

        try:
            terminate_aws_instance(
                instance_id,
                cloud_role_code(current_user, "aws"),
            )
            cleanup_requested = True

        except AWSCloudError:
            cleanup_requested = False

        if cleanup_requested:
            error_code = "aws_registration_failed"
            error_message = (
                "AWS instance registration failed and cloud cleanup was requested."
            )
            cleanup_status = "termination_requested"

        else:
            error_code = "aws_registration_cleanup_failed"
            error_message = (
                "AWS instance registration failed and automatic cloud cleanup failed."
            )
            cleanup_status = "cleanup_failed"

        mark_operation_failed(
            db,
            operation=operation,
            error_code=error_code,
            error_message=error_message,
            result_summary={
                "execution_mode": "aws",
                "resource_name": payload.name,
                "cleanup_status": cleanup_status,
            },
        )

        failure_details: dict[str, str] = {
            "execution_mode": "aws",
            "error_type": "database_registration_error",
            "cleanup_status": cleanup_status,
        }

        if not cleanup_requested:
            failure_details["orphaned_cloud_resource_id"] = instance_id

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=None,
            provider=CloudProvider.AWS.value,
            action="create",
            decision="allowed",
            reason_code="resource_registration_failed",
            required_permission="vm.create",
            role_code=cloud_role_code(current_user, "aws"),
            event_type="operation_failure",
            http_method=request.method,
            request_path=request.url.path,
            details=failure_details,
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AWS EC2 instance registration failed.",
        ) from exc

    return AWSInstanceCreateResponse(
        resource_id=resource.id,
        cloud_resource_id=instance_id,
        provider=CloudProvider.AWS,
        name=resource.name,
        status=resource.status,
        requested_by=current_user.id,
    )


# ============================================================
# AZURE CREATE
# ============================================================


def execute_azure_create_action(
    *,
    request: Request,
    db: DatabaseSession,
    payload: AzureInstanceCreateRequest,
    current_user: User,
    size: str | None = None,
    location: str | None = None,
    disk_type: str | None = None,
    disk_size_gb: int | None = None,
) -> AzureInstanceCreateResponse:
    correlation_id = uuid.UUID(
        request.state.correlation_id,
    )

    existing_resource = db.scalar(
        select(ManagedResource).where(
            ManagedResource.provider == CloudProvider.AZURE.value,
            ManagedResource.name == payload.name,
            ManagedResource.is_managed.is_(True),
        )
    )

    if existing_resource is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An Azure virtual machine with this name is already managed.",
        )

    managed_azure_vm_count = db.scalar(
        select(func.count())
        .select_from(ManagedResource)
        .where(
            ManagedResource.provider == CloudProvider.AZURE.value,
            ManagedResource.is_managed.is_(True),
        )
    )

    if managed_azure_vm_count >= settings.azure_max_managed_vms:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Azure managed virtual machine limit reached. "
                f"Maximum allowed: {settings.azure_max_managed_vms}."
            ),
        )

    operation = create_operation(
        db,
        correlation_id=correlation_id,
        user_id=current_user.id,
        resource_id=None,
        provider=CloudProvider.AZURE.value,
        action="create",
        required_permission="vm.create",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=None,
        provider=CloudProvider.AZURE.value,
        action="create",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.create",
        role_code=cloud_role_code(current_user, "azure"),
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "azure",
            "resource_name": payload.name,
        },
    )

    if not settings.azure_write_enabled:
        mark_operation_failed(
            db,
            operation=operation,
            error_code="azure_write_disabled",
            error_message="Azure write operations are disabled.",
            result_summary={
                "execution_mode": "disabled",
                "resource_name": payload.name,
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure write operations are disabled.",
        )

    db.commit()

    if not settings.azure_default_ssh_public_key:
        mark_operation_failed(
            db,
            operation=operation,
            error_code="azure_ssh_key_not_configured",
            error_message=("Azure default SSH public key is not configured."),
            result_summary={
                "execution_mode": "azure",
                "resource_name": payload.name,
            },
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Azure VM creation is not configured.",
        )

    effective_location = location or settings.azure_default_location

    try:
        cloud_resource_id = create_virtual_machine(
            name=payload.name,
            role_code=cloud_role_code(current_user, "azure"),
            ssh_public_key=settings.azure_default_ssh_public_key,
            admin_username=settings.azure_default_admin_username,
            size=size or settings.azure_default_vm_size,
            location=effective_location,
            os_disk_size_gb=disk_size_gb,
            disk_type=disk_type or "Standard_LRS",
            environment="dev",
        )

    except Exception as exc:
        mark_operation_failed(
            db,
            operation=operation,
            error_code="azure_create_failed",
            error_message=str(exc),
            result_summary={
                "execution_mode": "azure",
                "resource_name": payload.name,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=None,
            provider=CloudProvider.AZURE.value,
            action="create",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.create",
            role_code=cloud_role_code(current_user, "azure"),
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
            detail=("Azure virtual machine create operation failed."),
        ) from exc

    try:
        resource = register_azure_managed_resource(
            db=db,
            cloud_resource_id=cloud_resource_id,
            name=payload.name,
            location=effective_location,
            current_user=current_user,
        )

        operation.resource_id = resource.id

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "azure",
                "resource_name": payload.name,
                "cloud_resource_id": cloud_resource_id,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=resource.id,
            provider=CloudProvider.AZURE.value,
            action="create",
            decision="allowed",
            reason_code="cloud_operation_succeeded",
            required_permission="vm.create",
            role_code=cloud_role_code(current_user, "azure"),
            event_type="operation_success",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "execution_mode": "azure",
                "cloud_resource_id": cloud_resource_id,
            },
        )

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        mark_operation_failed(
            db,
            operation=operation,
            error_code="azure_registration_failed",
            error_message=(
                "Azure virtual machine was created but local registration failed."
            ),
            result_summary={
                "execution_mode": "azure",
                "resource_name": payload.name,
                "cloud_resource_id": cloud_resource_id,
            },
        )

        create_audit_log(
            db,
            correlation_id=correlation_id,
            operation_id=operation.id,
            user_id=current_user.id,
            resource_id=None,
            provider=CloudProvider.AZURE.value,
            action="create",
            decision="allowed",
            reason_code="resource_registration_failed",
            required_permission="vm.create",
            role_code=cloud_role_code(current_user, "azure"),
            event_type="operation_failure",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "execution_mode": "azure",
                "error_type": "database_registration_error",
                "orphaned_cloud_resource_id": (cloud_resource_id),
            },
        )

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Azure VM registration failed.",
        ) from exc

    return AzureInstanceCreateResponse(
        resource_id=resource.id,
        cloud_resource_id=cloud_resource_id,
        provider=CloudProvider.AZURE,
        name=resource.name,
        status=resource.status,
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
        role_code=cloud_role_code(current_user, "azure"),
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
            cloud_role_code(current_user, "azure"),
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "azure",
                "resource_name": resource.name,
            },
        )
        resource.status = "running"

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
            role_code=cloud_role_code(current_user, "azure"),
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
            detail=("Azure virtual machine start operation failed."),
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
        role_code=cloud_role_code(current_user, "aws"),
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
            cloud_role_code(current_user, "aws"),
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "aws",
                "resource_name": resource.name,
            },
        )
        resource.status = "running"

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
            role_code=cloud_role_code(current_user, "aws"),
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
        role_code=cloud_role_code(current_user, "azure"),
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
            cloud_role_code(current_user, "azure"),
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "azure",
                "resource_name": resource.name,
            },
        )
        resource.status = "stopped"

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
            role_code=cloud_role_code(current_user, "azure"),
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
            detail=("Azure virtual machine stop operation failed."),
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
        role_code=cloud_role_code(current_user, "aws"),
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
            cloud_role_code(current_user, "aws"),
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "aws",
                "resource_name": resource.name,
            },
        )
        resource.status = "stopped"

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
            role_code=cloud_role_code(current_user, "aws"),
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
# AZURE DELETE
# ============================================================


def execute_azure_delete_action(
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
        action="delete",
        required_permission="vm.delete",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AZURE.value,
        action="delete",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.delete",
        role_code=cloud_role_code(current_user, "azure"),
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "azure",
        },
    )

    try:
        delete_virtual_machine(
            resource.cloud_resource_id,
            cloud_role_code(current_user, "azure"),
        )

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "azure",
                "resource_name": resource.name,
            },
        )
        mark_resource_deleted(resource)

        db.commit()

    except Exception as exc:
        mark_operation_failed(
            db,
            operation=operation,
            error_code="azure_delete_failed",
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
            action="delete",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.delete",
            role_code=cloud_role_code(current_user, "azure"),
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
            detail="Azure virtual machine delete operation failed.",
        ) from exc

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=CloudProvider.AZURE,
        action="delete",
        status="success",
        requested_by=current_user.id,
    )


# ============================================================
# AWS DELETE
# ============================================================


def execute_aws_delete_action(
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
        action="delete",
        required_permission="vm.delete",
    )

    create_audit_log(
        db,
        correlation_id=correlation_id,
        operation_id=operation.id,
        user_id=current_user.id,
        resource_id=resource.id,
        provider=CloudProvider.AWS.value,
        action="delete",
        decision="allowed",
        reason_code="permission_granted",
        required_permission="vm.delete",
        role_code=cloud_role_code(current_user, "aws"),
        event_type="operation",
        http_method=request.method,
        request_path=request.url.path,
        details={
            "execution_mode": "aws",
        },
    )

    try:
        instance_state = get_aws_instance_state_by_id(
            resource.cloud_resource_id,
            cloud_role_code(current_user, "aws"),
        )

        if instance_state not in {
            None,
            "shutting-down",
            "terminated",
        }:
            try:
                terminate_aws_instance(
                    resource.cloud_resource_id,
                    cloud_role_code(current_user, "aws"),
                )
            except AWSCloudError as exc:
                if exc.code != "aws_instance_not_found":
                    raise
                # The instance is already gone from AWS (e.g. deleted outside
                # the platform, or a stale record from before write mode was
                # enabled). Deleting it here just needs to reach the same end
                # state, so treat "not found" as a successful delete.

        mark_operation_success(
            db,
            operation=operation,
            result_summary={
                "execution_mode": "aws",
                "resource_name": resource.name,
            },
        )
        mark_resource_deleted(resource)

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
            action="delete",
            decision="allowed",
            reason_code="cloud_operation_failed",
            required_permission="vm.delete",
            role_code=cloud_role_code(current_user, "aws"),
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
            detail="AWS EC2 instance delete operation failed.",
        ) from exc

    return InstanceActionResponse(
        resource_id=resource.id,
        provider=CloudProvider.AWS,
        action="delete",
        status="success",
        requested_by=current_user.id,
    )


# ============================================================
# LIST MANAGED INSTANCES
# ============================================================


def _refresh_resource_status_from_cloud(
    resource: ManagedResource,
    role_code: str,
) -> None:
    """
    Best-effort live-status refresh for resources still marked "pending".

    register_aws_managed_resource/register_azure_managed_resource always
    create a resource as "pending", and nothing else updates it until an
    explicit start/stop action runs. So once the cloud provider finishes
    booting it on its own, the resource is stuck showing "pending" forever
    even though it's really "running". Only "pending" resources are looked
    up (running/stopped/terminated are only ever changed by an explicit
    action, so they can't drift the same way) and a lookup failure
    (unreachable cloud, demo/fake cloud_resource_id, throttling, etc.) must
    never break the list — every failure here is swallowed and the
    previously known status is kept.
    """
    if resource.status != "pending":
        return

    try:
        if resource.provider == CloudProvider.AWS.value:
            real_status = get_aws_instance_state(
                resource.cloud_resource_id,
                role_code,
            )
        elif resource.provider == CloudProvider.AZURE.value:
            real_status = get_virtual_machine_power_state(
                resource.cloud_resource_id,
                role_code,
            )
        else:
            return
    except Exception:
        # A live-lookup failure is never fatal to listing.
        logger.warning(
            "Live status lookup failed for %s resource %s",
            resource.provider,
            resource.id,
            exc_info=True,
        )
        return

    if real_status and real_status != resource.status:
        resource.status = real_status


@router.get(
    "",
    response_model=list[InstanceSummary],
    status_code=status.HTTP_200_OK,
)
def list_instances(
    current_user: CurrentUser,
    db: DatabaseSession,
) -> list[ManagedResource]:
    # Only clouds the caller can read are listed; with no cloud access at all
    # the list is simply empty rather than an error.
    readable = [
        provider
        for provider in CLOUD_PROVIDERS
        if has_cloud_permission(current_user, provider, "vm.read")
    ]
    if not readable:
        return []

    statement = (
        select(ManagedResource)
        .where(
            ManagedResource.is_managed.is_(True),
            ManagedResource.provider.in_(readable),
        )
        .order_by(
            ManagedResource.provider,
            ManagedResource.name,
        )
    )

    resources = list(db.scalars(statement).all())

    for resource in resources:
        _refresh_resource_status_from_cloud(
            resource,
            cloud_role_code(current_user, resource.provider),
        )

    db.commit()

    return resources


# ============================================================
# CREATE AWS INSTANCE
# ============================================================


@router.post(
    "/aws",
    response_model=AWSInstanceCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_aws_managed_instance(
    request: Request,
    payload: AWSInstanceCreateRequest,
    current_user: CanCreateAwsInstances,
    db: DatabaseSession,
) -> AWSInstanceCreateResponse:
    return execute_aws_create_action(
        request=request,
        db=db,
        payload=payload,
        current_user=current_user,
    )


# ============================================================
# CREATE AZURE INSTANCE
# ============================================================


@router.post(
    "/azure",
    response_model=AzureInstanceCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_azure_managed_instance(
    request: Request,
    payload: AzureInstanceCreateRequest,
    current_user: CanCreateAzureInstances,
    db: DatabaseSession,
) -> AzureInstanceCreateResponse:
    return execute_azure_create_action(
        request=request,
        db=db,
        payload=payload,
        current_user=current_user,
    )


# ============================================================
# AWS LIVE INVENTORY
# ============================================================


@router.get(
    "/aws/live",
    response_model=list[AWSInstanceSummary],
    status_code=status.HTTP_200_OK,
)
def list_live_aws_instances(
    current_user: CanReadAwsInventory,
) -> list[dict[str, str | None]]:
    """
    Return the current AWS EC2 inventory visible to the authenticated
    application role.

    The application permission vm.read is checked before reaching AWS.
    The backend then assumes the corresponding AWS IAM role through STS.
    """
    try:
        return list_aws_instances(
            cloud_role_code(current_user, "aws"),
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
            cloud_role_code(current_user, provider.value),
        )

    elif provider is CloudProvider.AWS:
        try:
            real_status = get_aws_instance_state(
                resource.cloud_resource_id,
                cloud_role_code(current_user, provider.value),
            )

        except AWSCloudError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AWS EC2 instance status lookup failed.",
            ) from exc

        if real_status is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=("AWS EC2 instance not found or not managed by the platform."),
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

    if provider is CloudProvider.AZURE and settings.azure_write_enabled:
        return execute_azure_delete_action(
            request=request,
            db=db,
            resource=resource,
            current_user=current_user,
        )

    if provider is CloudProvider.AWS and settings.aws_write_enabled:
        return execute_aws_delete_action(
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
        action="delete",
        required_permission="vm.delete",
        current_user=current_user,
    )
