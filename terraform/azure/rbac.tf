resource "azurerm_role_definition" "viewer" {
  name        = "SMP Viewer"
  scope       = azurerm_resource_group.main.id
  description = "Permite consultar maquinas virtuales y su estado dentro del proyecto Secure Multicloud."

  permissions {
    actions = [
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/instanceView/read"
    ]

    not_actions = []
  }

  assignable_scopes = [
    azurerm_resource_group.main.id
  ]
}

resource "azurerm_role_definition" "operator" {
  name        = "SMP Operator"
  scope       = azurerm_resource_group.main.id
  description = "Permite consultar y operar el ciclo de encendido de maquinas virtuales dentro del proyecto Secure Multicloud."

  permissions {
    actions = [
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/instanceView/read",
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/powerOff/action",
      "Microsoft.Compute/virtualMachines/deallocate/action",
      "Microsoft.Compute/virtualMachines/restart/action"
    ]

    not_actions = []
  }

  assignable_scopes = [
    azurerm_resource_group.main.id
  ]
}

resource "azurerm_role_definition" "administrator" {
  name        = "SMP Administrator"
  scope       = azurerm_resource_group.main.id
  description = "Permite administrar maquinas virtuales y sus recursos auxiliares dentro de Secure Multicloud, sin administrar Azure RBAC."

  permissions {
    actions = [
      # Resource Group - lectura del contexto
      "Microsoft.Resources/subscriptions/resourceGroups/read",

      # Virtual Machines
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/instanceView/read",
      "Microsoft.Compute/virtualMachines/write",
      "Microsoft.Compute/virtualMachines/delete",
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/powerOff/action",
      "Microsoft.Compute/virtualMachines/deallocate/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Compute/virtualMachines/vmSizes/read",

      # Managed Disks
      "Microsoft.Compute/disks/read",
      "Microsoft.Compute/disks/write",
      "Microsoft.Compute/disks/delete",

      # Network Interfaces
      "Microsoft.Network/networkInterfaces/read",
      "Microsoft.Network/networkInterfaces/write",
      "Microsoft.Network/networkInterfaces/delete",
      "Microsoft.Network/networkInterfaces/join/action",

      # Existing network resources required when attaching a VM
      "Microsoft.Network/virtualNetworks/read",
      "Microsoft.Network/virtualNetworks/subnets/read",
      "Microsoft.Network/virtualNetworks/subnets/join/action",
      "Microsoft.Network/networkSecurityGroups/read"
    ]

    not_actions = []
  }

  assignable_scopes = [
    azurerm_resource_group.main.id
  ]
}

resource "azurerm_role_assignment" "viewer" {
  scope              = azurerm_resource_group.main.id
  role_definition_id = azurerm_role_definition.viewer.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.viewer.principal_id

  principal_type = "ServicePrincipal"
}

resource "azurerm_role_assignment" "operator" {
  scope              = azurerm_resource_group.main.id
  role_definition_id = azurerm_role_definition.operator.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.operator.principal_id

  principal_type = "ServicePrincipal"
}

resource "azurerm_role_assignment" "administrator" {
  scope              = azurerm_resource_group.main.id
  role_definition_id = azurerm_role_definition.administrator.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.administrator.principal_id

  principal_type = "ServicePrincipal"
}