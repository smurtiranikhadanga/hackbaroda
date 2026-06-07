"""
Pydantic schemas for request validation and response serialization.
"""
from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field


# ── Enums (mirroring SQLAlchemy enums) ───────────────────────────────────────
from enum import Enum


class SeverityEnum(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"
    critical = "Critical"


class StatusEnum(str, Enum):
    open = "Open"
    in_progress = "In Progress"
    resolved = "Resolved"


# ── Shared sub-schemas ────────────────────────────────────────────────────────
class PossibleCause(BaseModel):
    cause: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class SimilarIncident(BaseModel):
    incident_id: str
    title: str
    similarity: float
    cause: Optional[str] = None
    actual_fix: Optional[str] = None


class IncidentEvent(BaseModel):
    id: UUID
    incident_id: UUID
    event_type: str
    description: str
    occurred_at: datetime
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


# ── New Hackathon Specific Sub-schemas ────────────────────────────────────────
class RankedFix(BaseModel):
    fix_action: str
    success_rate: float
    description: str


class PreventionAction(BaseModel):
    action: str
    trigger_reason: str
    enabled: bool = True


class CrossCompanyReference(BaseModel):
    company: str
    outage_pattern: str
    recovery_strategy: str


# ── Chatbot Communication Schemas ─────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    incident_id: Optional[str] = None
    history: List[ChatMessage] = []


class ScanRequest(BaseModel):
    url: str


class ScanResponse(BaseModel):
    url: str
    troubleshooter_type: str
    severity: str
    complexity: str
    status: str
    issues_found: List[str]
    root_cause_analysis: List[Dict[str, Any]]  # [{"cause": str, "probability": float}]
    steps: List[str]
    quick_fixes: List[str]
    autodiagnostic_log: List[Dict[str, Any]]  # [{"time": str, "step": str, "result": str}]
    similar_incidents: List[Dict[str, Any]]  # [{"incident_id": str, "title": str, "resolution": str}]


class AutofixRequest(BaseModel):
    url: str


class AutofixResponse(BaseModel):
    url: str
    status: str
    autodiagnostic_log: List[Dict[str, Any]]  # [{"time": str, "step": str, "result": str}]
    complexity: str
    fixed_issue: str
    severity: str


class ChatResponse(BaseModel):
    reply: str
    resolved_by_bot: bool = False
    suggested_incident_data: Optional[Dict[str, Any]] = None
    diagnostic_card: Optional[ScanResponse] = None


# ── Request schemas ───────────────────────────────────────────────────────────
class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255, example="Website Down")
    symptoms: str = Field(..., min_length=5, example="API timeout, CPU 95%, Database error")
    engineer: Optional[str] = Field(None, example="alice@company.com")
    active_users: Optional[int] = Field(5000, ge=1, example=5000)
    affected_users: Optional[int] = Field(0, ge=0, example=4200)


class IncidentResolve(BaseModel):
    actual_cause: str = Field(..., example="Redis cache failure")
    actual_fix: str = Field(..., example="Restart Redis cluster")
    resolution_time_minutes: Optional[int] = Field(None, ge=0, example=40)


# ── Response schemas ──────────────────────────────────────────────────────────
class IncidentBase(BaseModel):
    id: UUID
    title: str
    symptoms: str
    severity: Optional[SeverityEnum]
    status: StatusEnum
    engineer: Optional[str]
    confidence: Optional[float]
    
    # User Impact metrics
    active_users: int
    affected_users: int
    impact_percent: float
    revenue_risk: str
    service_availability: str
    
    # Predictions & Clustering
    estimated_resolution_time_minutes: int
    cluster_id: Optional[str] = None
    cluster_name: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class IncidentAnalysisResponse(IncidentBase):
    """Returned right after incident submission + AI analysis."""
    incident_id: str          # human-readable INC-XXXX format
    similar_incidents: List[SimilarIncident] = []
    possible_causes: List[PossibleCause] = []
    recommended_steps: List[str] = []
    ai_causes: Optional[List[Dict]] = None
    ai_steps: Optional[List[str]] = None


class IncidentDetail(IncidentBase):
    """Full incident details including resolution info."""
    incident_id: str
    ai_causes: Optional[List[Dict]] = None
    ai_steps: Optional[List[str]] = None
    actual_cause: Optional[str] = None
    actual_fix: Optional[str] = None
    resolution_time_minutes: Optional[int] = None
    similar_incidents: List[SimilarIncident] = []
    timeline: List[IncidentEvent] = []


class IncidentListItem(IncidentBase):
    """Lightweight item for dashboard listing."""
    incident_id: str
    actual_cause: Optional[str] = None


class IncidentList(BaseModel):
    total: int
    incidents: List[IncidentListItem]


# ── Postmortem ─────────────────────────────────────────────────────────────────
class PostmortemReport(BaseModel):
    incident_id: str
    title: str
    severity: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]
    resolution_time_minutes: Optional[int]
    root_cause: Optional[str]
    impact_summary: str
    resolution_steps: List[str]
    lessons_learned: List[str]
    similar_incidents_referenced: List[str]


# ── Search ─────────────────────────────────────────────────────────────────────
class SearchResult(BaseModel):
    query: str
    results: List[SimilarIncident]
