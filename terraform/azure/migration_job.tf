# ============================================================
# DATABASE MIGRATION CONTAINER APP JOB
# ============================================================

resource "azurerm_role_assignment" "database_migration_acr_pull" {
  scope                = azurerm_container_registry.backend.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.database_migration.principal_id
  principal_type       = "ServicePrincipal"
}

resource "azurerm_container_app_job" "database_migration" {
  name                         = "job-smp-db-migrate-${var.environment}"
  location                     = var.location
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.backend.id

  workload_profile_name      = "Consumption"
  replica_timeout_in_seconds = 900
  replica_retry_limit        = 0

  identity {
    type = "UserAssigned"

    identity_ids = [
      azurerm_user_assigned_identity.database_migration.id,
    ]
  }

  registry {
    server   = azurerm_container_registry.backend.login_server
    identity = azurerm_user_assigned_identity.database_migration.id
  }

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "db-migrate"
      image  = "${azurerm_container_registry.backend.login_server}/smp-backend:0.1.16"
      cpu    = 0.25
      memory = "0.5Gi"

      command = [
        "uv",
        "run",
        "--no-sync",
        "python",
        "-m",
        "app.db.azure_migrate",
      ]

      env {
        name  = "APP_ENV"
        value = "production"
      }

      env {
        name  = "SECRET_KEY"
        value = "migration-job-not-used"
      }

      env {
        name  = "DATABASE_HOST"
        value = azurerm_postgresql_flexible_server.backend.fqdn
      }

      env {
        name  = "DATABASE_PORT"
        value = "5432"
      }

      env {
        name  = "DATABASE_NAME"
        value = azurerm_postgresql_flexible_server_database.backend.name
      }

      env {
        name  = "DATABASE_USER"
        value = azurerm_user_assigned_identity.database_migration.name
      }

      env {
        name  = "DATABASE_APPLICATION_USER"
        value = azurerm_user_assigned_identity.backend.name
      }

      env {
        name  = "DATABASE_APPLICATION_PRINCIPAL_ID"
        value = azurerm_user_assigned_identity.backend.principal_id
      }

      env {
        name  = "AZURE_MANAGED_IDENTITY_CLIENT_ID"
        value = azurerm_user_assigned_identity.database_migration.client_id
      }
    }
  }

  depends_on = [
    azurerm_role_assignment.database_migration_acr_pull,
    azurerm_postgresql_flexible_server_active_directory_administrator.migration,
    azurerm_postgresql_flexible_server_database.backend,
  ]

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "database-migrations"
  }
}
