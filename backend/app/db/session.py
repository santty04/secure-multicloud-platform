from collections.abc import Generator
from typing import Any

import psycopg
from azure.identity import ManagedIdentityCredential
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

POSTGRES_ENTRA_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"


def _create_local_engine() -> Engine:
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL must be configured when running in development."
        )

    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
    )


def _create_azure_managed_identity_engine() -> Engine:
    if not settings.database_host:
        raise RuntimeError("DATABASE_HOST is not configured.")

    if not settings.database_name:
        raise RuntimeError("DATABASE_NAME is not configured.")

    if not settings.database_user:
        raise RuntimeError("DATABASE_USER is not configured.")

    if not settings.azure_managed_identity_client_id:
        raise RuntimeError("AZURE_MANAGED_IDENTITY_CLIENT_ID is not configured.")

    credential = ManagedIdentityCredential(
        client_id=settings.azure_managed_identity_client_id,
    )

    def connect() -> Any:
        access_token = credential.get_token(POSTGRES_ENTRA_SCOPE).token

        return psycopg.connect(
            host=settings.database_host,
            port=settings.database_port,
            dbname=settings.database_name,
            user=settings.database_user,
            password=access_token,
            sslmode="require",
            connect_timeout=10,
        )

    return create_engine(
        "postgresql+psycopg://",
        creator=connect,
        pool_pre_ping=True,
        pool_recycle=3000,
    )


def create_database_engine() -> Engine:
    if settings.app_env == "development":
        return _create_local_engine()

    return _create_azure_managed_identity_engine()


engine = create_database_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
