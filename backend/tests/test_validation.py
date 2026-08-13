from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_valid_instance_request_is_accepted() -> None:
    response = client.post(
        "/validation/instance",
        json={
            "provider": "azure",
            "name": "demo-vm-01",
            "region": "eastus",
            "size": "Standard_B1s",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "valid": True,
        "provider": "azure",
        "name": "demo-vm-01",
        "region": "eastus",
        "size": "Standard_B1s",
    }


def test_invalid_provider_is_rejected() -> None:
    response = client.post(
        "/validation/instance",
        json={
            "provider": "google-cloud",
            "name": "demo-vm-01",
            "region": "test-region",
            "size": "test-size",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert (
        response.json()["error"]["correlation_id"]
        == response.headers["X-Correlation-ID"]
    )


def test_invalid_instance_name_is_rejected() -> None:
    response = client.post(
        "/validation/instance",
        json={
            "provider": "aws",
            "name": "../dangerous-name",
            "region": "us-east-1",
            "size": "t3.micro",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_unexpected_fields_are_rejected() -> None:
    response = client.post(
        "/validation/instance",
        json={
            "provider": "azure",
            "name": "demo-vm-01",
            "region": "eastus",
            "size": "Standard_B1s",
            "role": "administrator",
            "command": "terraform destroy",
        },
    )

    assert response.status_code == 422

    details = response.json()["error"]["details"]
    rejected_locations = {tuple(detail["location"]) for detail in details}

    assert ("body", "role") in rejected_locations
    assert ("body", "command") in rejected_locations
