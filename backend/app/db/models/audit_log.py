import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    __table_args__ = (
        CheckConstraint(
            "provider IN ('azure', 'aws')",
            name="provider_valid",
        ),
        CheckConstraint(
            "decision IN ('allowed', 'denied')",
            name="decision_valid",
        ),
        CheckConstraint(
            ("action IN ('create', 'read', 'start', 'stop', 'update', 'delete')"),
            name="action_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    correlation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    operation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "managed_resources.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    decision: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    reason_code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    required_permission: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    role_code: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="authorization",
        server_default="authorization",
    )

    http_method: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )

    request_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    details: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
