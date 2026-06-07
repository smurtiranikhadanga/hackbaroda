"""
Search API — GET /api/search?q=...
Performs a free-text semantic similarity search across all incidents in ChromaDB.
"""
from fastapi import APIRouter, Query
from app.schemas.incident import SearchResult, SimilarIncident
from app.services import vector_service

router = APIRouter()


@router.get("", response_model=SearchResult)
async def semantic_search(
    q: str = Query(..., min_length=2, description="Search query text"),
    limit: int = Query(10, ge=1, le=50),
):
    """
    Perform a semantic similarity search against all indexed incidents.
    Returns ranked results by cosine similarity.
    """
    raw_results = vector_service.search_by_text(query=q, n_results=limit)
    results = [
        SimilarIncident(
            incident_id=r["incident_id"],
            title=r["title"],
            similarity=r["similarity"],
            cause=r.get("cause"),
            actual_fix=r.get("actual_fix"),
        )
        for r in raw_results
    ]
    return SearchResult(query=q, results=results)
