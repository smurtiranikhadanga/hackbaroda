"""
Chat API — SRE conversational chat endpoint.
"""
from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.incident import ChatRequest, ChatResponse
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
            suggested_incident_data=response["suggested_incident_data"]
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"SRE Chat Agent error: {str(e)}")
