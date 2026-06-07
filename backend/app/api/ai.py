"""
AI API — standalone AI endpoints (knowledge graph, confidence, etc.)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.services import incident_service, vector_service

router = APIRouter()


@router.get("/knowledge-graph")
async def get_knowledge_graph(db: Session = Depends(get_db)):
    """
    Build a knowledge graph of causal relationships from resolved incidents.
    Returns nodes (incident types / causes) and edges (co-occurrence relationships).
    """
    resolved = incident_service.get_resolved_incidents(db)

    nodes = {}
    edges = []

    for incident in resolved:
        if not incident.actual_cause:
            continue

        cause = incident.actual_cause
        title = incident.title
        severity = incident.severity.value if incident.severity else "Unknown"

        # Node for the cause
        if cause not in nodes:
            nodes[cause] = {"id": cause, "label": cause, "type": "cause", "count": 0}
        nodes[cause]["count"] += 1

        # Node for the incident category (title keyword)
        category = title.split()[0] if title else "Unknown"
        if category not in nodes:
            nodes[category] = {"id": category, "label": category, "type": "incident", "count": 0}
        nodes[category]["count"] += 1

        # Edge from incident to cause
        edges.append({"source": category, "target": cause, "severity": severity})

    # Deduplicate edges
    unique_edges = {(e["source"], e["target"]): e for e in edges}

    return {
        "nodes": list(nodes.values()),
        "edges": list(unique_edges.values()),
    }


@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Return system-wide incident statistics."""
    all_incidents = incident_service.get_all_incidents(db, limit=10000)
    resolved = [i for i in all_incidents if i.status.value == "Resolved"]

    severity_counts = {}
    avg_confidence = 0.0
    avg_resolution_time = 0.0
    confidence_values = [i.confidence for i in all_incidents if i.confidence is not None]
    resolution_times = [i.resolution_time_minutes for i in resolved if i.resolution_time_minutes is not None]

    for inc in all_incidents:
        sev = inc.severity.value if inc.severity else "Unknown"
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    if confidence_values:
        avg_confidence = sum(confidence_values) / len(confidence_values)
    if resolution_times:
        avg_resolution_time = sum(resolution_times) / len(resolution_times)

    return {
        "total_incidents": len(all_incidents),
        "resolved_incidents": len(resolved),
        "open_incidents": len(all_incidents) - len(resolved),
        "severity_breakdown": severity_counts,
        "avg_ai_confidence": round(avg_confidence, 3),
        "avg_resolution_time_minutes": round(avg_resolution_time, 1),
    }
