"""create password setup tokens table

Revision ID: 7f3b2a9c1d4e
Revises: 609b68aea4c8
Create Date: 2026-09-22 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f3b2a9c1d4e"
down_revision: str | Sequence[str] | None = "609b68aea4c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "password_setup_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_password_setup_tokens_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_password_setup_tokens")),
        sa.UniqueConstraint(
            "token_hash", name=op.f("uq_password_setup_tokens_token_hash")
        ),
    )
    op.create_index(
        op.f("ix_password_setup_tokens_token_hash"),
        "password_setup_tokens",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_password_setup_tokens_user_id"),
        "password_setup_tokens",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f("ix_password_setup_tokens_user_id"), table_name="password_setup_tokens"
    )
    op.drop_index(
        op.f("ix_password_setup_tokens_token_hash"),
        table_name="password_setup_tokens",
    )
    op.drop_table("password_setup_tokens")
