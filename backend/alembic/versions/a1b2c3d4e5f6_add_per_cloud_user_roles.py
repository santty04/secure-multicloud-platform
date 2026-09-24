"""add per-cloud user roles

Revision ID: a1b2c3d4e5f6
Revises: 9d5e2f3a6b7c
Create Date: 2026-09-24 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "9d5e2f3a6b7c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    for provider in ("azure", "aws"):
        column = f"{provider}_role_id"
        op.add_column("users", sa.Column(column, sa.UUID(), nullable=True))
        op.create_foreign_key(
            op.f(f"fk_users_{column}_roles"),
            "users",
            "roles",
            [column],
            ["id"],
            ondelete="RESTRICT",
        )
        op.create_index(op.f(f"ix_users_{column}"), "users", [column])

    # Keep everyone's current reach: until an admin narrows it, each user acts
    # in both clouds with the role they already had.
    op.execute("UPDATE users SET azure_role_id = role_id, aws_role_id = role_id")


def downgrade() -> None:
    """Downgrade schema."""
    for provider in ("aws", "azure"):
        column = f"{provider}_role_id"
        op.drop_index(op.f(f"ix_users_{column}"), table_name="users")
        op.drop_constraint(
            op.f(f"fk_users_{column}_roles"), "users", type_="foreignkey"
        )
        op.drop_column("users", column)
