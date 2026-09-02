# ============================================================
# AZURE CONTAINER APPS ENVIRONMENT
# ============================================================

resource "azurerm_container_app_environment" "backend" {
  name                = "cae-smp-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  infrastructure_subnet_id = azurerm_subnet.container_apps.id

  internal_load_balancer_enabled = false
  zone_redundancy_enabled        = false

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "backend-container-apps"
  }
}
