import pytest
from azure.identity import AzureCliCredential, ManagedIdentityCredential

from app.cloud.azure.auth import (
    get_azure_credential,
    get_managed_identity_client_id,
)
from app.core.config import settings


def test_get_managed_identity_client_id_for_viewer(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        settings,
        "azure_viewer_client_id",
        "viewer-client-id",
    )

    client_id = get_managed_identity_client_id("viewer")

    assert client_id == "viewer-client-id"


def test_get_managed_identity_client_id_for_operator(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        settings,
        "azure_operator_client_id",
        "operator-client-id",
    )

    client_id = get_managed_identity_client_id("operator")

    assert client_id == "operator-client-id"


def test_get_managed_identity_client_id_for_administrator(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        settings,
        "azure_administrator_client_id",
        "administrator-client-id",
    )

    client_id = get_managed_identity_client_id("administrator")

    assert client_id == "administrator-client-id"


def test_get_managed_identity_client_id_rejects_unknown_role():
    with pytest.raises(
        ValueError,
        match="Unsupported Azure application role",
    ):
        get_managed_identity_client_id("auditor")


def test_get_managed_identity_client_id_requires_configuration(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        settings,
        "azure_viewer_client_id",
        None,
    )

    with pytest.raises(
        RuntimeError,
        match="Azure Managed Identity client ID is not configured",
    ):
        get_managed_identity_client_id("viewer")


def test_development_uses_azure_cli_credential(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        settings,
        "app_env",
        "development",
    )

    credential = get_azure_credential("viewer")

    assert isinstance(
        credential,
        AzureCliCredential,
    )


def test_runtime_uses_managed_identity_credential(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(
        settings,
        "app_env",
        "production",
    )

    monkeypatch.setattr(
        settings,
        "azure_operator_client_id",
        "operator-client-id",
    )

    credential = get_azure_credential(
        "operator"
    )

    assert isinstance(
        credential,
        ManagedIdentityCredential,
    )