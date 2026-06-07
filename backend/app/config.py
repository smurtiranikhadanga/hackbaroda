"""
Application configuration loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # AI Provider
    AI_PROVIDER: Literal["gemini", "openai", "groq"] = "gemini"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Database
    DATABASE_URL: str = "postgresql://incident_user:incident_pass@localhost:5432/incidents"

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "incidents"

    # App
    SECRET_KEY: str = "change_me"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
