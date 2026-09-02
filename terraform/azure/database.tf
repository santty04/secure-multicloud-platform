locals {
  postgresql_server_name = "psql-smp-${var.environment}-${substr(replace(data.azurerm_client_config.current.subscription_id, "-", ""), 0, 8)}"
}

# ============================================================
# PRIVATE DNS
# ============================================================

resource "azurerm_private_dns_zone" "postgresql" {
  name                = "smp-${var.environment}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "postgresql-private-dns"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "link-postgresql-${var.environment}"
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = azurerm_virtual_network.main.id
  resource_group_name   = azurerm_resource_group.main.name

  registration_enabled = false
}

# ============================================================
# POSTGRESQL FLEXIBLE SERVER
# ============================================================

resource "azurerm_postgresql_flexible_server" "backend" {
  name                = local.postgresql_server_name
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  zone                = "2"

  version = "16"

  delegated_subnet_id = azurerm_subnet.postgresql.id
  private_dns_zone_id = azurerm_private_dns_zone.postgresql.id

  public_network_access_enabled = false

  sku_name     = "B_Standard_B2s"
  storage_mb   = 32768
  storage_tier = "P4"

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  identity {
    type = "SystemAssigned"
  }

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = false
    tenant_id                     = data.azurerm_client_config.current.tenant_id
  }

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.postgresql,
  ]

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "backend-database"
  }
}

# ============================================================
# MICROSOFT ENTRA DATABASE ADMINISTRATOR
# ============================================================

resource "azurerm_postgresql_flexible_server_active_directory_administrator" "migration" {
  server_name         = azurerm_postgresql_flexible_server.backend.name
  resource_group_name = azurerm_resource_group.main.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  object_id      = azurerm_user_assigned_identity.database_migration.principal_id
  principal_name = azurerm_user_assigned_identity.database_migration.name
  principal_type = "ServicePrincipal"
}

# ============================================================
# APPLICATION DATABASE
# ============================================================

resource "azurerm_postgresql_flexible_server_database" "backend" {
  name      = "secure_multicloud"
  server_id = azurerm_postgresql_flexible_server.backend.id

  charset   = "UTF8"
  collation = "en_US.utf8"

  depends_on = [
    azurerm_postgresql_flexible_server_active_directory_administrator.migration,
  ]

  lifecycle {
    prevent_destroy = true
  }
}


