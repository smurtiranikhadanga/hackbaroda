"""Initial schema — incidents and incident_events tables

Revision ID: 0001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Create ENUM types ─────────────────────────────────────────────────────
    severity_enum = postgresql.ENUM(
        "Low", "Medium", "High", "Critical",
        name="severityenum", create_type=True
    )
    status_enum = postgresql.ENUM(
        "Open", "In Progress", "Resolved",
        name="statusenum", create_type=True
    )
    severity_enum.create(op.get_bind(), checkfirst=True)
    status_enum.create(op.get_bind(), checkfirst=True)

    # ── incidents table ────────────────────────────────────────────────────────
    op.create_table(
        "incidents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("symptoms", sa.Text(), nullable=False),
        sa.Column("severity", sa.Enum("Low", "Medium", "High", "Critical", name="severityenum"), nullable=True),
        sa.Column("status", sa.Enum("Open", "In Progress", "Resolved", name="statusenum"), nullable=False, server_default="Open"),
        sa.Column("engineer", sa.String(255), nullable=True),
        sa.Column("ai_causes", postgresql.JSONB(), nullable=True),
        sa.Column("ai_steps", postgresql.JSONB(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("actual_cause", sa.Text(), nullable=True),
        sa.Column("actual_fix", sa.Text(), nullable=True),
        sa.Column("resolution_time_minutes", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_incidents_id", "incidents", ["id"])

    # ── incident_events table ──────────────────────────────────────────────────
    op.create_table(
        "incident_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("incident_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_incident_events_id", "incident_events", ["id"])
    op.create_index("ix_incident_events_incident_id", "incident_events", ["incident_id"])


def downgrade() -> None:
    op.drop_table("incident_events")
    op.drop_table("incidents")
    op.execute("DROP TYPE IF EXISTS severityenum")
    op.execute("DROP TYPE IF EXISTS statusenum")
