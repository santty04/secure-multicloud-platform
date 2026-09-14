data "azurerm_client_config" "current" {}

locals {
  acr_name = "acrsmp${var.environment}${substr(replace(data.azurerm_client_config.current.subscription_id, "-", ""), 0, 8)}"
}

resource "azurerm_container_registry" "backend" {
  name                = local.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location

  sku           = "Basic"
  admin_enabled = false

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "backend-container-images"
  }
}

resource "azurerm_role_assignment" "backend_acr_pull" {
  scope                = azurerm_container_registry.backend.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.backend.principal_id
  principal_type       = "ServicePrincipal"
}
