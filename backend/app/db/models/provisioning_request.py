import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProvisioningRequest(Base):
    __tablename__ = "provisioning_requests"

    __table_args__ = (
        CheckConstraint(
            (
                "status IN ("
                "'pending', "
                "'approved', "
                "'rejected', "
                "'executing', "
                "'executed', "
                "'failed'"
                ")"
            ),
            name="ck_provisioning_requests_status_valid",
        ),
        CheckConstraint(
            "provider IN ('azure', 'aws')",
            name="ck_provisioning_requests_provider_valid",
        ),
        CheckConstraint(
            "environment IN ('dev', 'test', 'prod')",
            name="ck_provisioning_requests_environment_valid",
        ),
        CheckConstraint(
            "instance_count >= 1",
            name="ck_provisioning_requests_instance_count_positive",
        ),
        CheckConstraint(
            "disk_size_gb >= 1",
            name="ck_provisioning_requests_disk_size_positive",
        ),
        CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_provisioning_requests_confidence_valid",
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
        unique=True,
        index=True,
        default=uuid.uuid4,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )

    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    created_by_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    reviewed_by_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    original_request: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    provider_preference: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    max_monthly_budget_usd: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    provider: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    region: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    environment: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    instance_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    instance_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    disk_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    disk_size_gb: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    public_ip: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    architecture_summary: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    assumptions: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    risks: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    estimated_monthly_cost_usd: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    pricing_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    ai_provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    ai_model: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    review_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    managed_resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "managed_resources.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    operation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "operations.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    failure_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    rejected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    execution_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    executed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
