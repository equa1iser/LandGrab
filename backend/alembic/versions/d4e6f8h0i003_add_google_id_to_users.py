"""add google_id to users

Revision ID: d4e6f8h0i003
Revises: c3d5e7f9g002
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e6f8h0i003'
down_revision = 'c3d5e7f9g002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('google_id', sa.String(128), nullable=True))
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_users_google_id', table_name='users')
    op.drop_column('users', 'google_id')
