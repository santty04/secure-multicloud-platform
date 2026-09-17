# ============================================================
# MANAGED WORKLOADS RBAC
# ============================================================

resource "azurerm_role_definition" "managed_viewer" {
  name        = "SMP Managed Viewer"
  scope       = azurerm_resource_group.managed.id
  description = "Permite consultar maquinas virtuales administradas por Secure Multicloud."

  permissions {
    actions = [
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/instanceView/read",
      "Microsoft.Compute/disks/read",
      "Microsoft.Network/networkInterfaces/read",
      "Microsoft.Network/virtualNetworks/read",
      "Microsoft.Network/virtualNetworks/subnets/read",
      "Microsoft.Network/networkSecurityGroups/read"
    ]

    not_actions = []
  }

  assignable_scopes = [
    azurerm_resource_group.managed.id
  ]
}

resource "azurerm_role_definition" "managed_operator" {
  name        = "SMP Managed Operator"
  scope       = azurerm_resource_group.managed.id
  description = "Permite consultar, iniciar y detener maquinas virtuales administradas por Secure Multicloud."

  permissions {
    actions = [
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/instanceView/read",
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/powerOff/action",
      "Microsoft.Compute/virtualMachines/deallocate/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Compute/disks/read",
      "Microsoft.Network/networkInterfaces/read",
      "Microsoft.Network/virtualNetworks/read",
      "Microsoft.Network/virtualNetworks/subnets/read",
      "Microsoft.Network/networkSecurityGroups/read"
    ]

    not_actions = []
  }

  assignable_scopes = [
    azurerm_resource_group.managed.id
  ]
}

resource "azurerm_role_definition" "managed_administrator" {
  name        = "SMP Managed Administrator"
  scope       = azurerm_resource_group.managed.id
  description = "Permite administrar maquinas virtuales y recursos auxiliares administrados por Secure Multicloud."

  permissions {
    actions = [
      "Microsoft.Resources/subscriptions/resourceGroups/read",

      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Compute/virtualMachines/instanceView/read",
      "Microsoft.Compute/virtualMachines/write",
      "Microsoft.Compute/virtualMachines/delete",
      "Microsoft.Compute/virtualMachines/start/action",
      "Microsoft.Compute/virtualMachines/powerOff/action",
      "Microsoft.Compute/virtualMachines/deallocate/action",
      "Microsoft.Compute/virtualMachines/restart/action",
      "Microsoft.Compute/virtualMachines/vmSizes/read",

      "Microsoft.Compute/disks/read",
      "Microsoft.Compute/disks/write",
      "Microsoft.Compute/disks/delete",

      "Microsoft.Network/networkInterfaces/read",
      "Microsoft.Network/networkInterfaces/write",
      "Microsoft.Network/networkInterfaces/delete",
      "Microsoft.Network/networkInterfaces/join/action",

      "Microsoft.Network/virtualNetworks/read",
      "Microsoft.Network/virtualNetworks/subnets/read",
      "Microsoft.Network/virtualNetworks/subnets/join/action",
      "Microsoft.Network/networkSecurityGroups/read"
    ]

    not_actions = []
  }

  assignable_scopes = [
    azurerm_resource_group.managed.id
  ]
}

resource "azurerm_role_assignment" "managed_viewer" {
  scope              = azurerm_resource_group.managed.id
  role_definition_id = azurerm_role_definition.managed_viewer.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.viewer.principal_id

  principal_type = "ServicePrincipal"
}

resource "azurerm_role_assignment" "managed_operator" {
  scope              = azurerm_resource_group.managed.id
  role_definition_id = azurerm_role_definition.managed_operator.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.operator.principal_id

  principal_type = "ServicePrincipal"
}

resource "azurerm_role_assignment" "managed_administrator" {
  scope              = azurerm_resource_group.managed.id
  role_definition_id = azurerm_role_definition.managed_administrator.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.administrator.principal_id

  principal_type = "ServicePrincipal"
}
