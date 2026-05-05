"""add user preferences

Revision ID: b2c4d6e8f001
Revises: a1f5351e7701
Create Date: 2026-05-05 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b2c4d6e8f001'
down_revision: Union[str, None] = 'a1f5351e7701'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column(
        'preferences',
        postgresql.JSONB(astext_type=sa.Text()),
        server_default='{}',
        nullable=False,
    ))


def downgrade() -> None:
    op.drop_column('users', 'preferences')
