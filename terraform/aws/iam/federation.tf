# ============================================================
# MICROSOFT ENTRA -> AWS OIDC FEDERATION
# ============================================================

locals {
  azure_oidc_issuer = "https://login.microsoftonline.com/4f1e044d-3d70-4990-b26a-b95f0c642e1a/v2.0"

  # AWS uses azp as the OIDC audience when azp is present.
  azure_oidc_client_id = "5520cbf2-54f6-4dc8-af9f-1fc71c7916bf"

  # Original aud claim from the Entra token.
  azure_token_audience = "fb60f99c-7a34-4190-8149-302f77469936"

  # sub / principal ID of id-smp-backend-dev.
  azure_backend_subject = "b4df81f7-c0d0-4014-879f-4cd892988658"

  azure_oidc_condition_prefix = "login.microsoftonline.com/4f1e044d-3d70-4990-b26a-b95f0c642e1a/v2.0"
}

resource "aws_iam_openid_connect_provider" "azure_backend" {
  url = local.azure_oidc_issuer

  client_id_list = [
    local.azure_oidc_client_id
  ]

  tags = {
    Name        = "SecureMulticloudAzureBackendOIDC"
    project     = "secure-multicloud"
    environment = "dev"
    purpose     = "azure-backend-federation"
  }
}
