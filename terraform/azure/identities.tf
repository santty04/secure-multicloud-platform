resource "azurerm_user_assigned_identity" "viewer" {
  name                = "id-smp-viewer-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "rbac-viewer"
  }
}

resource "azurerm_user_assigned_identity" "operator" {
  name                = "id-smp-operator-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "rbac-operator"
  }
}

resource "azurerm_user_assigned_identity" "administrator" {
  name                = "id-smp-administrator-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "rbac-administrator"
  }
}

resource "azurerm_user_assigned_identity" "backend" {
  name                = "id-smp-backend-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "backend-workload-identity"
  }
}

resource "azurerm_user_assigned_identity" "database_migration" {
  name                = "id-smp-db-migration-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "database-migrations"
  }
}
