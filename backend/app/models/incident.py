"""
SQLAlchemy ORM models for the incidents database.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Float, DateTime, Enum, JSON, Integer
)
from sqlalchemy.dialects.postgresql import UUID
import enum
from app.db import Base


class SeverityEnum(str, enum.Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class StatusEnum(str, enum.Enum):
    open = "Open"
    in_progress = "In Progress"
    resolved = "Resolved"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    symptoms = Column(Text, nullable=False)
    severity = Column(Enum(SeverityEnum), nullable=True)
    status = Column(Enum(StatusEnum), default=StatusEnum.open, nullable=False)
    engineer = Column(String(255), nullable=True)

    # User Impact Analyzer
    active_users = Column(Integer, default=5000, nullable=False)
    affected_users = Column(Integer, default=0, nullable=False)
    impact_percent = Column(Float, default=0.0, nullable=False)
    revenue_risk = Column(String(50), default="Low", nullable=False)
    service_availability = Column(String(50), default="Normal", nullable=False)

    # Predictions & Grouping/Clustering
    estimated_resolution_time_minutes = Column(Integer, default=15, nullable=False)
    cluster_id = Column(String(100), nullable=True, index=True)
    cluster_name = Column(String(255), nullable=True)

    # AI-generated fields (structured ranked fixes, prevention etc.)
    ai_causes = Column(JSON, nullable=True)       # list of fixes/causes
    ai_steps = Column(JSON, nullable=True)        # list of prevention rules / steps
    confidence = Column(Float, nullable=True)

    # Resolution fields (engineer-recorded)
    actual_cause = Column(Text, nullable=True)
    actual_fix = Column(Text, nullable=True)
    resolution_time_minutes = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Incident id={self.id} title={self.title!r} status={self.status}>"


class IncidentEvent(Base):
    """Timeline events for an incident."""
    __tablename__ = "incident_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    incident_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)   # e.g. "alert_triggered", "ai_analysis_completed"
    description = Column(Text, nullable=False)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata_ = Column("metadata", JSON, nullable=True)

    def __repr__(self):
        return f"<IncidentEvent incident={self.incident_id} type={self.event_type}>"
