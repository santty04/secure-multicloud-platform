# ============================================================
# SECURE MULTICLOUD BACKEND API
# ============================================================

resource "azurerm_container_app" "backend" {
  name                         = "ca-smp-backend-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.backend.id
  resource_group_name          = azurerm_resource_group.main.name

  revision_mode         = "Single"
  workload_profile_name = "Consumption"

  identity {
    type = "UserAssigned"

    identity_ids = [
      azurerm_user_assigned_identity.backend.id,
      azurerm_user_assigned_identity.viewer.id,
      azurerm_user_assigned_identity.operator.id,
      azurerm_user_assigned_identity.administrator.id,
    ]
  }

  registry {
    server   = azurerm_container_registry.backend.login_server
    identity = azurerm_user_assigned_identity.backend.id
  }

  secret {
    name  = "jwt-secret"
    value = var.backend_secret_key
  }

  template {
    min_replicas = 1
    max_replicas = 3

    container {
      name   = "backend"
      image  = "${azurerm_container_registry.backend.login_server}/smp-backend:0.1.9"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "APP_ENV"
        value = "production"
      }

      env {
        name  = "APP_VERSION"
        value = "0.1.1"
      }

      env {
        name  = "DEBUG"
        value = "false"
      }

      env {
        name  = "CORS_ALLOWED_ORIGINS"
        value = jsonencode(["http://localhost:3000"])
      }

      env {
        name        = "SECRET_KEY"
        secret_name = "jwt-secret"
      }

      # ========================================================
      # POSTGRESQL
      # ========================================================

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
        value = azurerm_user_assigned_identity.backend.name
      }

      # ========================================================
      # AZURE MANAGED IDENTITIES
      # ========================================================

      env {
        name  = "AZURE_MANAGED_IDENTITY_CLIENT_ID"
        value = azurerm_user_assigned_identity.backend.client_id
      }

      env {
        name  = "AZURE_SUBSCRIPTION_ID"
        value = data.azurerm_client_config.current.subscription_id
      }

      env {
        name  = "AZURE_VIEWER_CLIENT_ID"
        value = azurerm_user_assigned_identity.viewer.client_id
      }

      env {
        name  = "AZURE_OPERATOR_CLIENT_ID"
        value = azurerm_user_assigned_identity.operator.client_id
      }

      env {
        name  = "AZURE_ADMINISTRATOR_CLIENT_ID"
        value = azurerm_user_assigned_identity.administrator.client_id
      }

      env {
        name  = "AZURE_RESOURCE_GROUP"
        value = azurerm_resource_group.managed.name
      }

      env {
        name  = "AZURE_MANAGED_SUBNET_ID"
        value = azurerm_subnet.managed_vm.id
      }

      env {
        name  = "AZURE_DEFAULT_VM_SIZE"
        value = "Standard_B2pts_v2"
      }

      env {
        name  = "AZURE_DEFAULT_LOCATION"
        value = "centralus"
      }

      env {
        name  = "AZURE_DEFAULT_ADMIN_USERNAME"
        value = "azureadmin"
      }

      env {
        name  = "AZURE_DEFAULT_SSH_PUBLIC_KEY"
        value = trimspace(file("${path.module}/keys/secure-multicloud-azure.pub"))
      }

      env {
        name  = "AZURE_MAX_MANAGED_VMS"
        value = "2"
      }

      # Administrative kill switches.
      # We will enable writes only after validating the deployment.

      env {
        name  = "AZURE_WRITE_ENABLED"
        value = "true"
      }

      env {
        name  = "AWS_WRITE_ENABLED"
        value = "true"
      }

      env {
        name  = "AWS_REGION"
        value = "us-east-2"
      }

      env {
        name  = "AWS_FEDERATION_AUDIENCE"
        value = "api://AzureADTokenExchange"
      }

      env {
        name  = "AWS_BACKEND_EXECUTION_ROLE_ARN"
        value = "arn:aws:iam::544709547055:role/SMPBackendExecutionRole"
      }

      env {
        name  = "AWS_VIEWER_ROLE_ARN"
        value = "arn:aws:iam::544709547055:role/SMPViewerRole"
      }

      env {
        name  = "AWS_OPERATOR_ROLE_ARN"
        value = "arn:aws:iam::544709547055:role/SMPOperatorRole"
      }

      env {
        name  = "AWS_ADMINISTRATOR_ROLE_ARN"
        value = "arn:aws:iam::544709547055:role/SMPAdministratorRole"
      }

      env {
        name  = "AWS_AMI_ID"
        value = "ami-02c98622c4c3f017d"
      }

      env {
        name  = "AWS_SUBNET_ID"
        value = "subnet-0ff0c9bdb8b1e5b56"
      }

      env {
        name  = "AWS_SECURITY_GROUP_ID"
        value = "sg-0ef437e4bbd47e90c"
      }
    }
  }

  ingress {
    external_enabled           = true
    target_port                = 8000
    transport                  = "auto"
    allow_insecure_connections = false

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  depends_on = [
    azurerm_role_assignment.backend_acr_pull,
    azurerm_container_app_job.database_migration,
  ]

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "backend-api"
  }
}
