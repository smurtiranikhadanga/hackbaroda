"""
Incidents API router — the main analysis pipeline.

POST   /api/incidents          — submit + analyze a new incident
GET    /api/incidents          — list all incidents
GET    /api/incidents/{id}     — get incident detail
POST   /api/incidents/{id}/resolve  — record resolution + enrich memory
GET    /api/incidents/{id}/timeline — get incident event timeline
"""
from __future__ import annotations
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.incident import (
    IncidentCreate,
    IncidentResolve,
    IncidentAnalysisResponse,
    IncidentDetail,
    IncidentList,
    IncidentListItem,
    SimilarIncident,
    PossibleCause,
    IncidentEvent,
)
from app.services import incident_service, vector_service, ai_service
from app.models.incident import Incident

logger = logging.getLogger(__name__)
router = APIRouter()


def _format_id(incident: Incident, db: Session) -> str:
    """Generate INC-XXXX from the total incident count."""
    total = incident_service.count_incidents(db)
    return f"INC-{total:04d}"


# ── POST /api/incidents ────────────────────────────────────────────────────────
@router.post("", response_model=IncidentAnalysisResponse, status_code=201)
async def create_and_analyze_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
):
    """
    Full analysis pipeline:
    1. Persist incident in DB with impact assessment & automatic clustering
    2. Embed and store in memory store (ChromaDB or in-memory)
    3. Find similar past incidents
    4. Predict incident severity
    5. Run root cause, ranked fix, prevention, and cross-company SRE analysis
    6. Update database record with AI results & predictions
    7. Return full analytical response
    """
    # 1. Persist (automatically clusters and evaluates user impact)
    incident = incident_service.create_incident(db, payload)
    incident_id_str = str(incident.id)

    # 2. Store embedding
    try:
        vector_service.store_incident_embedding(
            incident_id=incident_id_str,
            title=payload.title,
            symptoms=payload.symptoms,
        )
        incident_service.add_event(db, incident.id, "embedding_stored", "Incident embedded in vector memory.")
    except Exception as e:
        logger.warning("ChromaDB embedding failed (non-fatal): %s", e)

    # 3. Similarity search
    similar_raw = []
    try:
        similar_raw = vector_service.find_similar_incidents(
            title=payload.title,
            symptoms=payload.symptoms,
            n_results=5,
            exclude_id=incident_id_str,
        )
        incident_service.add_event(
            db, incident.id, "similarity_search_complete",
            f"Found {len(similar_raw)} similar incidents.",
        )
    except Exception as e:
        logger.warning("Similarity search failed (non-fatal): %s", e)

    # 4. Severity prediction
    severity = "High"
    try:
        severity = ai_service.predict_severity(payload.title, payload.symptoms)
        incident_service.add_event(db, incident.id, "severity_predicted", f"Predicted severity: {severity}.")
    except Exception as e:
        logger.warning("Severity prediction failed (non-fatal): %s", e)

    # 5. Root cause, ranked fixes, and SRE best practices analysis
    analysis = {
        "possible_causes": [],
        "ranked_fixes": [],
        "prevention_recommendations": [],
        "cross_company_references": [],
        "estimated_resolution_time_minutes": 15,
        "overall_confidence": 0.0
    }
    try:
        analysis = ai_service.analyze_root_causes(payload.title, payload.symptoms, similar_raw)
        incident_service.add_event(
            db, incident.id, "ai_analysis_completed",
            f"AI analysis done. Confidence: {analysis['overall_confidence']:.0%}.",
        )
    except Exception as e:
        logger.warning("AI analysis failed (non-fatal): %s", e)

    # 6. Persist AI results (including predictions and ranked fixes)
    incident = incident_service.update_incident_analysis(
        db=db,
        incident=incident,
        severity=severity,
        ai_causes=analysis["ranked_fixes"],
        ai_steps=[p["action"] for p in analysis["prevention_recommendations"]],
        confidence=analysis["overall_confidence"],
        estimated_resolution_time=analysis["estimated_resolution_time_minutes"],
    )

    # 7. Build response
    total = incident_service.count_incidents(db)
    inc_id = f"INC-{total:04d}"

    similar_out = [
        SimilarIncident(
            incident_id=s["incident_id"],
            title=s["title"],
            similarity=s["similarity"],
            cause=s.get("cause"),
            actual_fix=s.get("actual_fix"),
        )
        for s in similar_raw
    ]
    causes_out = [
        PossibleCause(cause=c["cause"], confidence=c["confidence"])
        for c in analysis["possible_causes"]
    ]

    return IncidentAnalysisResponse(
        id=incident.id,
        incident_id=inc_id,
        title=incident.title,
        symptoms=incident.symptoms,
        severity=incident.severity,
        status=incident.status,
        engineer=incident.engineer,
        confidence=incident.confidence,
        
        # User Impact fields
        active_users=incident.active_users,
        affected_users=incident.affected_users,
        impact_percent=incident.impact_percent,
        revenue_risk=incident.revenue_risk,
        service_availability=incident.service_availability,
        
        # Predictions & Grouping
        estimated_resolution_time_minutes=incident.estimated_resolution_time_minutes,
        cluster_id=incident.cluster_id,
        cluster_name=incident.cluster_name,
        
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        resolved_at=incident.resolved_at,
        similar_incidents=similar_out,
        possible_causes=causes_out,
        recommended_steps=[p["action"] for p in analysis["prevention_recommendations"]],
        ai_causes=incident.ai_causes,
        ai_steps=incident.ai_steps,
    )


# ── GET /api/incidents ─────────────────────────────────────────────────────────
@router.get("", response_model=IncidentList)
async def list_incidents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    incidents = incident_service.get_all_incidents(db, skip=skip, limit=limit)
    total = incident_service.count_incidents(db)
    items = [
        IncidentListItem(
            id=inc.id,
            incident_id=f"INC-{(i + skip + 1):04d}",
            title=inc.title,
            symptoms=inc.symptoms,
            severity=inc.severity,
            status=inc.status,
            engineer=inc.engineer,
            confidence=inc.confidence,
            
            # User Impact
            active_users=inc.active_users,
            affected_users=inc.affected_users,
            impact_percent=inc.impact_percent,
            revenue_risk=inc.revenue_risk,
            service_availability=inc.service_availability,
            
            # Predictions & Grouping
            estimated_resolution_time_minutes=inc.estimated_resolution_time_minutes,
            cluster_id=inc.cluster_id,
            cluster_name=inc.cluster_name,
            
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            resolved_at=inc.resolved_at,
            actual_cause=inc.actual_cause,
        )
        for i, inc in enumerate(incidents)
    ]
    return IncidentList(total=total, incidents=items)


# ── GET /api/incidents/{id} ────────────────────────────────────────────────────
@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident(incident_id: UUID, db: Session = Depends(get_db)):
    incident = incident_service.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    total = incident_service.count_incidents(db)
    timeline_events = incident_service.get_timeline(db, incident_id)
    similar_raw = []
    try:
        similar_raw = vector_service.find_similar_incidents(
            title=incident.title,
            symptoms=incident.symptoms,
            n_results=5,
            exclude_id=str(incident_id),
        )
    except Exception:
        pass

    similar_out = [
        SimilarIncident(
            incident_id=s["incident_id"],
            title=s["title"],
            similarity=s["similarity"],
            cause=s.get("cause"),
            actual_fix=s.get("actual_fix"),
        )
        for s in similar_raw
    ]

    events_out = [
        IncidentEvent(
            id=e.id,
            incident_id=e.incident_id,
            event_type=e.event_type,
            description=e.description,
            occurred_at=e.occurred_at,
            metadata=e.metadata_,
        )
        for e in timeline_events
    ]

    return IncidentDetail(
        id=incident.id,
        incident_id=f"INC-{total:04d}",
        title=incident.title,
        symptoms=incident.symptoms,
        severity=incident.severity,
        status=incident.status,
        engineer=incident.engineer,
        confidence=incident.confidence,
        
        # User Impact
        active_users=incident.active_users,
        affected_users=incident.affected_users,
        impact_percent=incident.impact_percent,
        revenue_risk=incident.revenue_risk,
        service_availability=incident.service_availability,
        
        # Predictions & Grouping
        estimated_resolution_time_minutes=incident.estimated_resolution_time_minutes,
        cluster_id=incident.cluster_id,
        cluster_name=incident.cluster_name,
        
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        resolved_at=incident.resolved_at,
        ai_causes=incident.ai_causes,
        ai_steps=incident.ai_steps,
        actual_cause=incident.actual_cause,
        actual_fix=incident.actual_fix,
        resolution_time_minutes=incident.resolution_time_minutes,
        similar_incidents=similar_out,
        timeline=events_out,
    )


# ── POST /api/incidents/{id}/resolve ──────────────────────────────────────────
@router.post("/{incident_id}/resolve", response_model=IncidentDetail)
async def resolve_incident(
    incident_id: UUID,
    payload: IncidentResolve,
    db: Session = Depends(get_db),
):
    incident = incident_service.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Resolve in DB
    incident = incident_service.resolve_incident(db, incident, payload)

    # Enrich vector memory with resolution context
    try:
        vector_service.update_incident_embedding(
            incident_id=str(incident_id),
            title=incident.title,
            symptoms=incident.symptoms,
            actual_cause=payload.actual_cause,
            actual_fix=payload.actual_fix,
            severity=incident.severity.value if incident.severity else None,
            resolved_at=str(incident.resolved_at) if incident.resolved_at else None,
        )
        incident_service.add_event(
            db, incident.id, "memory_updated",
            "ChromaDB memory enriched with resolution context."
        )
    except Exception as e:
        logger.warning("ChromaDB update failed (non-fatal): %s", e)

    return await get_incident(incident_id, db)


# ── GET /api/incidents/{id}/timeline ──────────────────────────────────────────
@router.get("/{incident_id}/timeline", response_model=list)
async def get_incident_timeline(incident_id: UUID, db: Session = Depends(get_db)):
    incident = incident_service.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = incident_service.get_timeline(db, incident_id)
    return [
        {
            "id": str(e.id),
            "event_type": e.event_type,
            "description": e.description,
            "occurred_at": e.occurred_at.isoformat(),
            "metadata": e.metadata_,
        }
        for e in events
    ]
