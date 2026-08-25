import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select

from app.api.dependencies import DatabaseSession, require_permission
from app.db.models import AuditLog, Operation, User
from app.schemas.audit_log import AuditLogResponse
from app.schemas.operation import OperationResponse

router = APIRouter(
    tags=["Operations and audit"],
)

CanReadOperations = Annotated[
    User,
    Depends(require_permission("operation.read")),
]


@router.get(
    "/operations",
    response_model=list[OperationResponse],
)
def list_operations(
    current_user: CanReadOperations,
    db: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[Operation]:
    del current_user

    statement = select(Operation).order_by(Operation.requested_at.desc()).limit(limit)

    return list(db.scalars(statement).all())


@router.get(
    "/operations/{operation_id}",
    response_model=OperationResponse,
)
def get_operation(
    operation_id: uuid.UUID,
    current_user: CanReadOperations,
    db: DatabaseSession,
) -> Operation:
    del current_user

    operation = db.get(Operation, operation_id)

    if operation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operation not found.",
        )

    return operation


@router.get(
    "/audit-logs",
    response_model=list[AuditLogResponse],
)
def list_audit_logs(
    current_user: CanReadOperations,
    db: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[AuditLog]:
    del current_user

    statement = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)

    return list(db.scalars(statement).all())
