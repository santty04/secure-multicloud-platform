output "resource_group_name" {
  description = "Name of the Azure Resource Group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID of the Azure Resource Group"
  value       = azurerm_resource_group.main.id
}

output "virtual_network_name" {
  description = "Name of the Azure Virtual Network"
  value       = azurerm_virtual_network.main.name
}

output "subnet_id" {
  description = "ID of the application subnet"
  value       = azurerm_subnet.app.id
}

output "network_security_group_name" {
  description = "Name of the application Network Security Group"
  value       = azurerm_network_security_group.app.name
}