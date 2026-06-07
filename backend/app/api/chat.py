"""
Chat API — SRE conversational chat endpoint.
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.incident import ChatRequest, ChatResponse, ScanRequest, ScanResponse, AutofixRequest, AutofixResponse
from app.services import ai_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_with_sre_bot(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Conversational support chatbot endpoint.
    Guides users through authentication/website diagnostics or drafts incident reports.
    """
    try:
        # Convert Pydantic ChatMessages to dict for service
        history_dicts = [{"role": h.role, "content": h.content} for h in payload.history]
        
        response = ai_service.chat_with_agent(
            message=payload.message,
            history=history_dicts,
            incident_id=payload.incident_id
        )
        return ChatResponse(
            reply=response["reply"],
            resolved_by_bot=response["resolved_by_bot"],
            suggested_incident_data=response["suggested_incident_data"],
            diagnostic_card=response.get("diagnostic_card")
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"SRE Chat Agent error: {str(e)}")


@router.post("/scan", response_model=ScanResponse)
async def scan_website(payload: ScanRequest):
    """
    Scans a target URL and returns diagnostic telemetry data.
    """
    try:
        report = ai_service.run_site_scan(payload.url)
        return ScanResponse(**report)
    except Exception as e:
        logger.error(f"Error in scan endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"SRE Scanner error: {str(e)}")


@router.post("/autofix", response_model=AutofixResponse)
async def autofix_website(payload: AutofixRequest):
    """
    Performs simulated SRE remediation script fixes on the target URL.
    """
    try:
        remediation = ai_service.run_site_autofix(payload.url)
        return AutofixResponse(**remediation)
    except Exception as e:
        logger.error(f"Error in autofix endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"SRE Autofixer error: {str(e)}")
