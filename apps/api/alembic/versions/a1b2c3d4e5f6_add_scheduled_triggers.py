"""add scheduled_triggers table

Revision ID: a1b2c3d4e5f6
Revises: 0e785d094cbd
Create Date: 2026-04-03 20:31:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '0e785d094cbd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # checkfirst=True makes this idempotent: if create_all() already ran, skip silently
    op.create_table(
        'scheduled_triggers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workflow_id', sa.Integer(), sa.ForeignKey('workflows.id'), nullable=False),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organisations.id'), nullable=True),
        sa.Column('cron_expr', sa.String(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=True, server_default=sa.text('1')),
        sa.Column('next_run_at', sa.DateTime(), nullable=True),
        sa.Column('last_run_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workflow_id'),
        if_not_exists=True,
    )
    # Index creation is also guarded
    try:
        op.create_index(op.f('ix_scheduled_triggers_id'), 'scheduled_triggers', ['id'], unique=False)
    except Exception:
        pass  # index already exists


def downgrade() -> None:
    op.drop_index(op.f('ix_scheduled_triggers_id'), table_name='scheduled_triggers')
    op.drop_table('scheduled_triggers')
