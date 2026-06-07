"""
Vector service — ChromaDB operations for semantic similarity search.

Uses sentence-transformers to embed incident text locally (when available),
or falls back to a lightweight hash-based embedding for development.
"""
from __future__ import annotations
import logging
import hashlib
import math
from typing import List, Optional, Dict, Any

from app.config import settings

logger = logging.getLogger(__name__)

# ── Optional heavy dependencies ────────────────────────────────────────────────
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    logger.warning("chromadb not installed — using in-memory fallback store")

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
except ImportError:
    ST_AVAILABLE = False
    logger.warning("sentence-transformers not installed — using hash-based embeddings")

# ── Singleton instances ────────────────────────────────────────────────────────
_chroma_client = None
_collection = None
_embedder = None

# In-memory fallback store when ChromaDB isn't available
_memory_store: Dict[str, Dict] = {}

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 128  # smaller dim for hash fallback


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        logger.info("Loading sentence-transformer model: %s", EMBEDDING_MODEL)
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
    return _embedder


def _get_client() -> chromadb.HttpClient | None:
    global _chroma_client, CHROMA_AVAILABLE
    if not CHROMA_AVAILABLE:
        return None
    if _chroma_client is None:
        try:
            logger.info("Connecting to ChromaDB at %s:%s...", settings.CHROMA_HOST, settings.CHROMA_PORT)
            _chroma_client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
            # Quick check if it is responsive
            _chroma_client.heartbeat()
            logger.info("Successfully connected to ChromaDB")
        except Exception as e:
            logger.warning("Failed to connect to ChromaDB (%s) — falling back to in-memory store", e)
            CHROMA_AVAILABLE = False
            _chroma_client = None
    return _chroma_client


def _get_collection():
    global _collection
    client = _get_client()
    if client is None:
        return None
    if _collection is None:
        try:
            _collection = client.get_or_create_collection(
                name=settings.CHROMA_COLLECTION,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info("Using ChromaDB collection: %s", settings.CHROMA_COLLECTION)
        except Exception as e:
            logger.warning("Failed to get/create ChromaDB collection (%s) — falling back to in-memory store", e)
            global CHROMA_AVAILABLE
            CHROMA_AVAILABLE = False
            _collection = None
    return _collection


def _hash_embed(text: str) -> List[float]:
    """Generate a deterministic pseudo-random vector based on md5 hash for fallback."""
    words = text.lower().split()
    if not words:
        return [0.0] * EMBEDDING_DIM
    
    vector = [0.0] * EMBEDDING_DIM
    for word in words:
        h = hashlib.md5(word.encode("utf-8")).hexdigest()
        for i in range(4):
            val = int(h[i*8:(i+1)*8], 16)
            dim = val % EMBEDDING_DIM
            sign = 1.0 if (val % 2 == 0) else -1.0
            vector[dim] += sign
            
    # Normalize vector to unit length
    magnitude = math.sqrt(sum(x*x for x in vector))
    if magnitude > 0:
        vector = [x / magnitude for x in vector]
    return vector


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a*a for a in v1))
    mag2 = math.sqrt(sum(b*b for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product / (mag1 * mag2)


# ── Public API ─────────────────────────────────────────────────────────────────
def embed_text(text: str) -> List[float]:
    """Generate a vector embedding for an arbitrary text string."""
    global ST_AVAILABLE
    if ST_AVAILABLE:
        try:
            embedder = _get_embedder()
            vector = embedder.encode(text, convert_to_numpy=True)
            return vector.tolist()
        except Exception as e:
            logger.warning("sentence-transformers encoding failed (%s) — falling back to hash-based embedding", e)
            ST_AVAILABLE = False
    return _hash_embed(text)


def store_incident_embedding(
    incident_id: str,
    title: str,
    symptoms: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Embed and store a new incident in ChromaDB.
    Called right after the incident is created in PostgreSQL.
    """
    text = f"{title}. Symptoms: {symptoms}"
    vector = embed_text(text)

    doc_metadata = metadata or {}
    doc_metadata.update({"incident_id": incident_id, "title": title})

    collection = _get_collection()
    if collection is not None:
        try:
            collection.upsert(
                ids=[incident_id],
                embeddings=[vector],
                documents=[text],
                metadatas=[doc_metadata],
            )
            logger.info("Stored embedding for incident %s in ChromaDB", incident_id)
            return
        except Exception as e:
            logger.warning("ChromaDB upsert failed (%s) — using in-memory store", e)

    # In-memory store fallback
    _memory_store[incident_id] = {
        "id": incident_id,
        "embedding": vector,
        "document": text,
        "metadata": doc_metadata,
    }
    logger.info("Stored embedding for incident %s in-memory store", incident_id)


def update_incident_embedding(
    incident_id: str,
    title: str,
    symptoms: str,
    actual_cause: str,
    actual_fix: str,
    severity: Optional[str] = None,
    resolved_at: Optional[str] = None,
) -> None:
    """
    Update the embedding after resolution to include cause/fix context.
    This enriches the memory for future similarity searches.
    """
    text = (
        f"{title}. Symptoms: {symptoms}. "
        f"Root cause: {actual_cause}. Fix: {actual_fix}."
    )
    vector = embed_text(text)

    metadata = {
        "incident_id": incident_id,
        "title": title,
        "severity": severity or "Unknown",
        "actual_cause": actual_cause,
        "actual_fix": actual_fix,
        "resolved_at": resolved_at or "",
    }

    collection = _get_collection()
    if collection is not None:
        try:
            collection.upsert(
                ids=[incident_id],
                embeddings=[vector],
                documents=[text],
                metadatas=[metadata],
            )
            logger.info("Updated embedding for resolved incident %s in ChromaDB", incident_id)
            return
        except Exception as e:
            logger.warning("ChromaDB update failed (%s) — using in-memory store", e)

    # In-memory store fallback
    _memory_store[incident_id] = {
        "id": incident_id,
        "embedding": vector,
        "document": text,
        "metadata": metadata,
    }
    logger.info("Updated embedding for resolved incident %s in-memory store", incident_id)


def find_similar_incidents(
    title: str,
    symptoms: str,
    n_results: int = 5,
    exclude_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Find the most similar past incidents using cosine similarity.

    Returns a list of dicts with:
      - incident_id
      - title
      - similarity  (0.0 – 1.0)
      - cause       (actual_cause if resolved)
      - actual_fix
    """
    text = f"{title}. Symptoms: {symptoms}"
    vector = embed_text(text)

    collection = _get_collection()
    if collection is not None:
        try:
            count = collection.count()
            if count == 0:
                return []

            fetch_n = min(n_results + 1, count)
            results = collection.query(
                query_embeddings=[vector],
                n_results=fetch_n,
                include=["metadatas", "distances"],
            )

            similar = []
            ids = results["ids"][0]
            distances = results["distances"][0]
            metadatas = results["metadatas"][0]

            for doc_id, distance, meta in zip(ids, distances, metadatas):
                if exclude_id and doc_id == exclude_id:
                    continue
                # ChromaDB cosine distance → similarity
                similarity = round(1.0 - distance, 4)
                similar.append(
                    {
                        "incident_id": meta.get("incident_id", doc_id),
                        "title": meta.get("title", ""),
                        "similarity": similarity,
                        "cause": meta.get("actual_cause"),
                        "actual_fix": meta.get("actual_fix"),
                    }
                )
            return similar[:n_results]
        except Exception as e:
            logger.warning("ChromaDB query failed (%s) — using in-memory store", e)

    # In-memory store fallback search
    similar = []
    for doc_id, doc in _memory_store.items():
        if exclude_id and doc_id == exclude_id:
            continue
        sim = _cosine_similarity(vector, doc["embedding"])
        meta = doc["metadata"]
        similar.append(
            {
                "incident_id": doc_id,
                "title": meta.get("title", ""),
                "similarity": round(sim, 4),
                "cause": meta.get("actual_cause"),
                "actual_fix": meta.get("actual_fix"),
            }
        )
    # Sort by similarity descending
    similar.sort(key=lambda x: x["similarity"], reverse=True)
    return similar[:n_results]


def search_by_text(query: str, n_results: int = 10) -> List[Dict[str, Any]]:
    """Free-text similarity search (used by GET /api/search)."""
    return find_similar_incidents(title=query, symptoms="", n_results=n_results)


def get_all_embeddings() -> Dict[str, Any]:
    """Return all stored incident IDs and metadata (for knowledge graph)."""
    collection = _get_collection()
    if collection is not None:
        try:
            count = collection.count()
            if count == 0:
                return {"ids": [], "metadatas": []}

            results = collection.get(
                limit=count,
                include=["metadatas"],
            )
            return {"ids": results["ids"], "metadatas": results["metadatas"]}
        except Exception as e:
            logger.warning("ChromaDB get failed (%s) — using in-memory store", e)

    # In-memory store fallback
    ids = list(_memory_store.keys())
    metadatas = [doc["metadata"] for doc in _memory_store.values()]
    return {"ids": ids, "metadatas": metadatas}
