import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
engine = None

if db_url.startswith("postgresql"):
    try:
        logger.info("Checking connection to PostgreSQL database...")
        # Try to connect with a short timeout
        temp_engine = create_engine(db_url, connect_args={"connect_timeout": 3})
        with temp_engine.connect() as conn:
            # Execute a simple query
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
        engine = temp_engine
        logger.info("Successfully connected to PostgreSQL database")
    except Exception as e:
        logger.warning(
            f"Could not connect to PostgreSQL ({e}). Falling back to SQLite local database."
        )
        db_url = "sqlite:///./incidents.db"

if engine is None:
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    engine = create_engine(
        db_url,
        connect_args=connect_args,
    )
    logger.info(f"Using database: {db_url}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
