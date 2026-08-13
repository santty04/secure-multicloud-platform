from uuid import UUID

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_unknown_route_returns_standard_error() -> None:
    response = client.get("/route-that-does-not-exist")

    assert response.status_code == 404

    correlation_id = response.headers["X-Correlation-ID"]

    assert UUID(correlation_id).version == 4
    assert response.json() == {
        "error": {
            "code": "resource_not_found",
            "message": "Not Found",
            "correlation_id": correlation_id,
        }
    }
