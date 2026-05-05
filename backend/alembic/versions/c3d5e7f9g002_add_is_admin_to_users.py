"""add is_admin to users

Revision ID: c3d5e7f9g002
Revises: b2c4d6e8f001
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d5e7f9g002'
down_revision: Union[str, None] = 'b2c4d6e8f001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column(
        'is_admin',
        sa.Boolean(),
        server_default='false',
        nullable=False,
    ))


def downgrade() -> None:
    op.drop_column('users', 'is_admin')
