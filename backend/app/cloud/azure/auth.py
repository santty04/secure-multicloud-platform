from azure.core.credentials import TokenCredential
from azure.identity import AzureCliCredential, ManagedIdentityCredential

from app.core.config import settings

AZURE_ROLE_CODES = {
    "viewer",
    "operator",
    "administrator",
}


def get_managed_identity_client_id(
    role_code: str,
) -> str:
    client_ids = {
        "viewer": settings.azure_viewer_client_id,
        "operator": settings.azure_operator_client_id,
        "administrator": settings.azure_administrator_client_id,
    }

    if role_code not in AZURE_ROLE_CODES:
        raise ValueError(
            f"Unsupported Azure application role: {role_code}"
        )

    client_id = client_ids[role_code]

    if not client_id:
        raise RuntimeError(
            f"Azure Managed Identity client ID is not configured "
            f"for role: {role_code}"
        )

    return client_id


def get_azure_credential(
    role_code: str,
) -> TokenCredential:
    if settings.app_env == "development":
        return AzureCliCredential()

    client_id = get_managed_identity_client_id(
        role_code
    )

    return ManagedIdentityCredential(
        client_id=client_id
    )