"""add requested name to provisioning requests

Revision ID: 52edff7476a6
Revises: a1b2c3d4e5f6
Create Date: 2026-09-24 18:43:59.402683
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "52edff7476a6"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "provisioning_requests",
        sa.Column(
            "requested_name",
            sa.String(length=64),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column(
        "provisioning_requests",
        "requested_name",
    )
