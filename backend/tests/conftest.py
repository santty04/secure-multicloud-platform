from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

import app.db.models
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app

if not settings.test_database_url.endswith("_test"):
    raise RuntimeError("TEST_DATABASE_URL must point to a database ending in '_test'.")


test_engine = create_engine(
    settings.test_database_url,
    pool_pre_ping=True,
)


@pytest.fixture(scope="session")
def prepare_test_database() -> Generator[None]:
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    yield

    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session(
    prepare_test_database: None,
) -> Generator[Session]:
    connection = test_engine.connect()
    transaction = connection.begin()

    session = Session(
        bind=connection,
        autoflush=False,
        expire_on_commit=False,
    )

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(
    db_session: Session,
) -> Generator[TestClient]:
    def override_get_db() -> Generator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def captured_emails() -> list[dict]:
    return []


@pytest.fixture(autouse=True)
def stub_password_setup_email(monkeypatch, captured_emails) -> None:
    """Replace real Resend delivery with an in-memory capture for tests."""

    def _fake_send(user, token) -> None:
        captured_emails.append(
            {"user_id": user.id, "email": user.email, "token": token}
        )

    monkeypatch.setattr("app.api.routes.users.send_password_setup_email", _fake_send)
