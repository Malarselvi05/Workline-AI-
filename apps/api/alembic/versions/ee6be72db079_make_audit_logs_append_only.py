"""make_audit_logs_append_only

Revision ID: ee6be72db079
Revises: b0d206ef50d7
Create Date: 2026-04-07 20:37:01.412074

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee6be72db079'
down_revision: Union[str, Sequence[str], None] = 'b0d206ef50d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    if conn.dialect.name == "sqlite":
        op.execute("""
            CREATE TRIGGER prevent_audit_log_update 
            BEFORE UPDATE ON audit_logs
            BEGIN
                SELECT RAISE(ABORT, 'audit_logs is append-only');
            END;
        """)
        op.execute("""
            CREATE TRIGGER prevent_audit_log_delete 
            BEFORE DELETE ON audit_logs
            BEGIN
                SELECT RAISE(ABORT, 'audit_logs is append-only');
            END;
        """)
    elif conn.dialect.name == "postgresql":
        op.execute("""
            CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'audit_logs is append-only';
            END;
            $$ LANGUAGE plpgsql;
        """)
        op.execute("""
            CREATE TRIGGER trg_prevent_audit_log_mutation
            BEFORE UPDATE OR DELETE ON audit_logs
            FOR EACH ROW EXECUTE PROCEDURE prevent_audit_log_mutation();
        """)


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    if conn.dialect.name == "sqlite":
        op.execute("DROP TRIGGER IF EXISTS prevent_audit_log_update")
        op.execute("DROP TRIGGER IF EXISTS prevent_audit_log_delete")
    elif conn.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON audit_logs")
        op.execute("DROP FUNCTION IF EXISTS prevent_audit_log_mutation")
