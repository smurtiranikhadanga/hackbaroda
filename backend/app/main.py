"""
AI Incident Management System — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.db import engine, Base
from app.api import incidents, search, ai, reports, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    # Ensure all tables exist (fallback if alembic not run)
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown — nothing to clean up for now


app = FastAPI(
    title="Incident Mind AI",
    description=(
        "Intelligent incident management platform combining vector memory, "
        "LLM-powered analysis, and a learning loop."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(chat.router, prefix="/api/ai", tags=["AI Chatbot"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Incident Mind AI",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
