"""
Incident service — CRUD operations against SQLite/PostgreSQL database via SQLAlchemy.
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.incident import Incident, IncidentEvent, SeverityEnum, StatusEnum
from app.schemas.incident import IncidentCreate, IncidentResolve

logger = logging.getLogger(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────────
def _make_incident_id(index: int) -> str:
    """Generate a human-readable INC-XXXX string from the row count."""
    return f"INC-{index:04d}"


def _get_incident_index(db: Session) -> int:
    """Count all incidents to generate sequential IDs."""
    return db.query(Incident).count() + 1


# ── CRUD ───────────────────────────────────────────────────────────────────────
def create_incident(db: Session, payload: IncidentCreate) -> Incident:
    """Persist a new incident record, perform impact analysis, and handle clustering."""
    active_users = payload.active_users if payload.active_users is not None else 5000
    affected_users = payload.affected_users if payload.affected_users is not None else 0
    impact_percent = round((affected_users / active_users * 100), 2) if active_users > 0 else 0.0
    
    if impact_percent >= 80:
        revenue_risk = "High"
        service_availability = "Critical"
    elif impact_percent >= 30:
        revenue_risk = "Medium"
        service_availability = "Degraded"
    else:
        revenue_risk = "Low"
        service_availability = "Normal"

    # ── Grouping / Clustering ──────────────────────────────────────────────────
    cluster_id = None
    cluster_name = None
    
    try:
        from app.services import vector_service
        similar = vector_service.find_similar_incidents(payload.title, payload.symptoms, n_results=1)
        if similar and similar[0]["similarity"] >= 0.65:
            matched_id_str = similar[0]["incident_id"]
            # Convert string ID to UUID if needed
            matched_uuid = uuid.UUID(matched_id_str) if isinstance(matched_id_str, str) else matched_id_str
            matched_inc = db.query(Incident).filter(Incident.id == matched_uuid).first()
            if matched_inc and matched_inc.cluster_id:
                cluster_id = matched_inc.cluster_id
                cluster_name = matched_inc.cluster_name
                logger.info(f"Automatically grouped incident with existing cluster '{cluster_name}' (ID: {cluster_id})")
    except Exception as e:
        logger.warning(f"Clustering comparison failed: {e}")

    if not cluster_id:
        cluster_id = str(uuid.uuid4())
        # Generate semantic cluster name based on keywords in title
        lower_title = payload.title.lower()
        if "db" in lower_title or "database" in lower_title or "postgres" in lower_title:
            cluster_name = "Database Performance Issue"
        elif "auth" in lower_title or "login" in lower_title or "password" in lower_title:
            cluster_name = "Authentication Service Issue"
        elif "cache" in lower_title or "redis" in lower_title:
            cluster_name = "Cache Outage Issue"
        elif "api" in lower_title or "server" in lower_title or "gateway" in lower_title:
            cluster_name = "API Gateway Issue"
        else:
            words = payload.title.split()
            keyword = words[0] if words else "System"
            cluster_name = f"{keyword} Service Issue"
        logger.info(f"Created new incident cluster '{cluster_name}' (ID: {cluster_id})")

    incident = Incident(
        id=uuid.uuid4(),
        title=payload.title,
        symptoms=payload.symptoms,
        engineer=payload.engineer,
        status=StatusEnum.open,
        active_users=active_users,
        affected_users=affected_users,
        impact_percent=impact_percent,
        revenue_risk=revenue_risk,
        service_availability=service_availability,
        cluster_id=cluster_id,
        cluster_name=cluster_name,
        estimated_resolution_time_minutes=15,  # default placeholder, updated by AI later
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # Log events to the timeline
    add_event(db, incident.id, "incident_created", f"Incident '{payload.title}' submitted by {payload.engineer or 'unknown'}.")
    add_event(db, incident.id, "impact_assessed", f"Impact assessed: {affected_users}/{active_users} active users affected ({impact_percent}%). Availability: {service_availability}. Revenue Risk: {revenue_risk}.")
    add_event(db, incident.id, "incident_clustered", f"Incident assigned to cluster '{cluster_name}'.")
    
    return incident


def get_incident(db: Session, incident_id: uuid.UUID) -> Optional[Incident]:
    return db.query(Incident).filter(Incident.id == incident_id).first()


def get_all_incidents(db: Session, skip: int = 0, limit: int = 100) -> List[Incident]:
    return (
        db.query(Incident)
        .order_by(desc(Incident.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )


def count_incidents(db: Session) -> int:
    return db.query(Incident).count()


def update_incident_analysis(
    db: Session,
    incident: Incident,
    severity: str,
    ai_causes: list,
    ai_steps: list,
    confidence: float,
    estimated_resolution_time: int = 15,
) -> Incident:
    """Store AI analysis results, predictions, ranked fixes, and alerts."""
    incident.severity = severity
    incident.ai_causes = ai_causes
    incident.ai_steps = ai_steps
    incident.confidence = confidence
    incident.estimated_resolution_time_minutes = estimated_resolution_time
    incident.status = StatusEnum.in_progress
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)

    add_event(db, incident.id, "ai_analysis_completed",
              f"AI analysis complete. Severity: {severity}. Confidence: {confidence:.0%}.")
    add_event(db, incident.id, "resolution_time_predicted",
              f"Estimated resolution time: {estimated_resolution_time} minutes.")
    return incident


def resolve_incident(db: Session, incident: Incident, payload: IncidentResolve) -> Incident:
    """Record actual resolution details and mark the incident as resolved."""
    incident.actual_cause = payload.actual_cause
    incident.actual_fix = payload.actual_fix
    incident.resolution_time_minutes = payload.resolution_time_minutes
    incident.status = StatusEnum.resolved
    incident.resolved_at = datetime.utcnow()
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)

    add_event(db, incident.id, "incident_resolved",
              f"Resolved. Root cause: {payload.actual_cause}. Fix: {payload.actual_fix}.")
    return incident


def get_resolved_incidents(db: Session) -> List[Incident]:
    """Return all resolved incidents (for knowledge graph / stats)."""
    return (
        db.query(Incident)
        .filter(Incident.status == StatusEnum.resolved)
        .order_by(desc(Incident.resolved_at))
        .all()
    )


# ── Timeline events ────────────────────────────────────────────────────────────
def add_event(
    db: Session,
    incident_id: uuid.UUID,
    event_type: str,
    description: str,
    metadata: Optional[dict] = None,
) -> IncidentEvent:
    event = IncidentEvent(
        id=uuid.uuid4(),
        incident_id=incident_id,
        event_type=event_type,
        description=description,
        occurred_at=datetime.utcnow(),
        metadata_=metadata,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_timeline(db: Session, incident_id: uuid.UUID) -> List[IncidentEvent]:
    return (
        db.query(IncidentEvent)
        .filter(IncidentEvent.incident_id == incident_id)
        .order_by(IncidentEvent.occurred_at)
        .all()
    )
