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