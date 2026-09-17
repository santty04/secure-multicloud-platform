output "resource_group_name" {
  description = "Nombre del Resource Group principal"
  value       = azurerm_resource_group.main.name
}

output "virtual_network_name" {
  description = "Nombre de la red virtual"
  value       = azurerm_virtual_network.main.name
}

output "subnet_id" {
  description = "ID de la subnet de aplicacion"
  value       = azurerm_subnet.app.id
}

output "network_security_group_name" {
  description = "Nombre del Network Security Group"
  value       = azurerm_network_security_group.app.name
}

output "viewer_identity_id" {
  description = "Resource ID de la Managed Identity Viewer"
  value       = azurerm_user_assigned_identity.viewer.id
}

output "viewer_identity_principal_id" {
  description = "Principal ID de la Managed Identity Viewer"
  value       = azurerm_user_assigned_identity.viewer.principal_id
}

output "viewer_identity_client_id" {
  description = "Client ID de la Managed Identity Viewer"
  value       = azurerm_user_assigned_identity.viewer.client_id
}

output "operator_identity_id" {
  description = "Resource ID de la Managed Identity Operator"
  value       = azurerm_user_assigned_identity.operator.id
}

output "operator_identity_principal_id" {
  description = "Principal ID de la Managed Identity Operator"
  value       = azurerm_user_assigned_identity.operator.principal_id
}

output "operator_identity_client_id" {
  description = "Client ID de la Managed Identity Operator"
  value       = azurerm_user_assigned_identity.operator.client_id
}

output "administrator_identity_id" {
  description = "Resource ID de la Managed Identity Administrator"
  value       = azurerm_user_assigned_identity.administrator.id
}

output "administrator_identity_principal_id" {
  description = "Principal ID de la Managed Identity Administrator"
  value       = azurerm_user_assigned_identity.administrator.principal_id
}

output "administrator_identity_client_id" {
  description = "Client ID de la Managed Identity Administrator"
  value       = azurerm_user_assigned_identity.administrator.client_id
}

output "viewer_role_definition_id" {
  description = "ID del Custom Role SMP Viewer"
  value       = azurerm_role_definition.viewer.role_definition_resource_id
}

output "operator_role_definition_id" {
  description = "ID del Custom Role SMP Operator"
  value       = azurerm_role_definition.operator.role_definition_resource_id
}

output "administrator_role_definition_id" {
  description = "ID del Custom Role SMP Administrator"
  value       = azurerm_role_definition.administrator.role_definition_resource_id
}

output "rbac_scope" {
  description = "Scope utilizado para las asignaciones RBAC"
  value       = azurerm_resource_group.main.id
}
output "container_apps_subnet_id" {
  description = "Subnet dedicada a Azure Container Apps"
  value       = azurerm_subnet.container_apps.id
}

output "postgresql_subnet_id" {
  description = "Subnet delegada a PostgreSQL Flexible Server"
  value       = azurerm_subnet.postgresql.id
}

output "backend_identity_id" {
  description = "Resource ID de la Managed Identity del backend"
  value       = azurerm_user_assigned_identity.backend.id
}

output "backend_identity_client_id" {
  description = "Client ID de la Managed Identity del backend"
  value       = azurerm_user_assigned_identity.backend.client_id
}

output "backend_identity_principal_id" {
  description = "Principal ID de la Managed Identity del backend"
  value       = azurerm_user_assigned_identity.backend.principal_id
}

output "container_registry_name" {
  description = "Nombre del Azure Container Registry"
  value       = azurerm_container_registry.backend.name
}

output "container_registry_login_server" {
  description = "Login server del Azure Container Registry"
  value       = azurerm_container_registry.backend.login_server
}

output "postgresql_server_name" {
  description = "Nombre del PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.backend.name
}

output "postgresql_fqdn" {
  description = "FQDN privado del PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.backend.fqdn
}

output "postgresql_database_name" {
  description = "Nombre de la base de datos del backend"
  value       = azurerm_postgresql_flexible_server_database.backend.name
}

output "database_migration_identity_id" {
  description = "Resource ID de la Managed Identity de migraciones"
  value       = azurerm_user_assigned_identity.database_migration.id
}

output "database_migration_identity_client_id" {
  description = "Client ID de la Managed Identity de migraciones"
  value       = azurerm_user_assigned_identity.database_migration.client_id
}

output "database_migration_identity_principal_id" {
  description = "Principal ID de la Managed Identity de migraciones"
  value       = azurerm_user_assigned_identity.database_migration.principal_id
}

output "container_app_environment_id" {
  description = "Resource ID del Azure Container Apps Environment"
  value       = azurerm_container_app_environment.backend.id
}

output "container_app_environment_name" {
  description = "Nombre del Azure Container Apps Environment"
  value       = azurerm_container_app_environment.backend.name
}

output "container_app_environment_default_domain" {
  description = "Dominio por defecto del Azure Container Apps Environment"
  value       = azurerm_container_app_environment.backend.default_domain
}

output "container_app_environment_static_ip" {
  description = "IP de infraestructura del Azure Container Apps Environment"
  value       = azurerm_container_app_environment.backend.static_ip_address
}

output "managed_resource_group_name" {
  description = "Resource Group destinado a recursos administrados por Secure Multicloud"
  value       = azurerm_resource_group.managed.name
}

output "managed_virtual_network_name" {
  description = "Nombre de la VNet destinada a recursos administrados"
  value       = azurerm_virtual_network.managed.name
}

output "managed_subnet_id" {
  description = "Resource ID de la subnet destinada a maquinas virtuales administradas"
  value       = azurerm_subnet.managed_vm.id
}

output "managed_network_security_group_name" {
  description = "Nombre del NSG de las maquinas virtuales administradas"
  value       = azurerm_network_security_group.managed_vm.name
}
