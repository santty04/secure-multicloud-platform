"""create auth events table

Revision ID: 9d5e2f3a6b7c
Revises: 8c4d1e2f5a6b
Create Date: 2026-09-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9d5e2f3a6b7c"
down_revision: str | Sequence[str] | None = "8c4d1e2f5a6b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "auth_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("correlation_id", sa.UUID(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=300), nullable=True),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_auth_events_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_events")),
    )
    op.create_index(op.f("ix_auth_events_event_type"), "auth_events", ["event_type"])
    op.create_index(op.f("ix_auth_events_user_id"), "auth_events", ["user_id"])
    op.create_index(op.f("ix_auth_events_created_at"), "auth_events", ["created_at"])
    op.create_index(
        "ix_auth_events_email_created_at", "auth_events", ["email", "created_at"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_auth_events_email_created_at", table_name="auth_events")
    op.drop_index(op.f("ix_auth_events_created_at"), table_name="auth_events")
    op.drop_index(op.f("ix_auth_events_user_id"), table_name="auth_events")
    op.drop_index(op.f("ix_auth_events_event_type"), table_name="auth_events")
    op.drop_table("auth_events")
