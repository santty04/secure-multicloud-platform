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
