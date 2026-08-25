import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import Operation


def create_operation(
    db: Session,
    *,
    correlation_id: uuid.UUID,
    user_id: uuid.UUID,
    resource_id: uuid.UUID | None,
    provider: str,
    action: str,
    required_permission: str,
) -> Operation:
    operation = Operation(
        correlation_id=correlation_id,
        user_id=user_id,
        resource_id=resource_id,
        provider=provider,
        action=action,
        required_permission=required_permission,
        status="pending",
    )

    db.add(operation)
    db.flush()

    return operation


def mark_operation_success(
    db: Session,
    *,
    operation: Operation,
    result_summary: dict[str, Any] | None = None,
) -> Operation:
    operation.status = "success"
    operation.result_summary = result_summary
    operation.error_code = None
    operation.error_message = None
    operation.completed_at = datetime.now(UTC)

    db.flush()

    return operation


def mark_operation_failed(
    db: Session,
    *,
    operation: Operation,
    error_code: str,
    error_message: str,
    result_summary: dict[str, Any] | None = None,
) -> Operation:
    operation.status = "failed"
    operation.result_summary = result_summary
    operation.error_code = error_code
    operation.error_message = error_message
    operation.completed_at = datetime.now(UTC)

    db.flush()

    return operation
