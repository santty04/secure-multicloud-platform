import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import AuditLog


def create_audit_log(
    db: Session,
    *,
    correlation_id: uuid.UUID,
    user_id: uuid.UUID | None,
    resource_id: uuid.UUID | None,
    provider: str,
    action: str,
    decision: str,
    reason_code: str,
    required_permission: str,
    role_code: str | None = None,
    operation_id: uuid.UUID | None = None,
    event_type: str = "authorization",
    http_method: str | None = None,
    request_path: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        correlation_id=correlation_id,
        operation_id=operation_id,
        user_id=user_id,
        resource_id=resource_id,
        provider=provider,
        action=action,
        decision=decision,
        reason_code=reason_code,
        required_permission=required_permission,
        role_code=role_code,
        event_type=event_type,
        http_method=http_method,
        request_path=request_path,
        details=details,
    )

    db.add(audit_log)
    db.flush()

    return audit_log