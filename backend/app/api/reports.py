"""
Reports API — GET /api/reports/{incident_id}
Generates postmortem reports (JSON or PDF).
"""
from __future__ import annotations
import io
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.incident import PostmortemReport
from app.services import incident_service, ai_service, vector_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _generate_postmortem_data(incident_id: UUID, db: Session) -> PostmortemReport:
    """Core logic to gather data and call AI for postmortem generation."""
    incident = incident_service.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Similar incidents for reference
    similar_raw = []
    try:
        similar_raw = vector_service.find_similar_incidents(
            title=incident.title,
            symptoms=incident.symptoms,
            n_results=3,
            exclude_id=str(incident_id),
        )
    except Exception:
        pass

    # AI postmortem generation
    ai_data = ai_service.generate_postmortem(
        title=incident.title,
        symptoms=incident.symptoms,
        severity=incident.severity.value if incident.severity else None,
        actual_cause=incident.actual_cause,
        actual_fix=incident.actual_fix,
        resolution_time_minutes=incident.resolution_time_minutes,
        similar_incidents=similar_raw,
    )

    total = incident_service.count_incidents(db)

    return PostmortemReport(
        incident_id=f"INC-{total:04d}",
        title=incident.title,
        severity=incident.severity.value if incident.severity else None,
        created_at=incident.created_at,
        resolved_at=incident.resolved_at,
        resolution_time_minutes=incident.resolution_time_minutes,
        root_cause=incident.actual_cause,
        impact_summary=ai_data["impact_summary"],
        resolution_steps=ai_data["resolution_steps"],
        lessons_learned=ai_data["lessons_learned"],
        similar_incidents_referenced=[s["incident_id"] for s in similar_raw],
    )


@router.get("/{incident_id}", response_model=PostmortemReport)
async def get_postmortem_json(incident_id: UUID, db: Session = Depends(get_db)):
    """Return postmortem report as JSON."""
    return _generate_postmortem_data(incident_id, db)


@router.get("/{incident_id}/pdf")
async def get_postmortem_pdf(incident_id: UUID, db: Session = Depends(get_db)):
    """Generate and return postmortem report as a PDF file."""
    report = _generate_postmortem_data(incident_id, db)

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        )

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=inch, leftMargin=inch,
                                topMargin=inch, bottomMargin=inch)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18,
                                     textColor=colors.HexColor("#1a1a2e"), spaceAfter=6)
        h2_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13,
                                  textColor=colors.HexColor("#4361ee"), spaceBefore=12, spaceAfter=4)
        body_style = styles["BodyText"]

        story = []

        # Header
        story.append(Paragraph(f"📋 Postmortem Report — {report.incident_id}", title_style))
        story.append(Paragraph(report.title, styles["Heading2"]))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#4361ee")))
        story.append(Spacer(1, 0.15 * inch))

        # Meta table
        meta_data = [
            ["Severity", report.severity or "Unknown"],
            ["Created", report.created_at.strftime("%Y-%m-%d %H:%M UTC")],
            ["Resolved", report.resolved_at.strftime("%Y-%m-%d %H:%M UTC") if report.resolved_at else "Not resolved"],
            ["Time to Resolve", f"{report.resolution_time_minutes} minutes" if report.resolution_time_minutes else "—"],
            ["Root Cause", report.root_cause or "Not determined"],
        ]
        t = Table(meta_data, colWidths=[1.8 * inch, 4.5 * inch])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f0f4ff")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d0d7e8")),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f7f9ff")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.2 * inch))

        # Impact
        story.append(Paragraph("Impact Summary", h2_style))
        story.append(Paragraph(report.impact_summary, body_style))
        story.append(Spacer(1, 0.1 * inch))

        # Resolution steps
        story.append(Paragraph("Resolution Steps", h2_style))
        for step in report.resolution_steps:
            story.append(Paragraph(f"• {step}", body_style))
        story.append(Spacer(1, 0.1 * inch))

        # Lessons learned
        story.append(Paragraph("Lessons Learned", h2_style))
        for lesson in report.lessons_learned:
            story.append(Paragraph(f"• {lesson}", body_style))

        doc.build(story)
        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=postmortem_{report.incident_id}.pdf"},
        )

    except ImportError:
        raise HTTPException(status_code=500, detail="PDF generation requires reportlab. Install it with: pip install reportlab")
