resource "azurerm_network_interface" "vm" {
  name                = "nic-${var.project_name}-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.app.id
    private_ip_address_allocation = "Dynamic"
  }

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "academic"
  }
}

resource "azurerm_linux_virtual_machine" "main" {
  name                = "vm-${var.project_name}-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  size                = "Standard_B2pts_v2"

  admin_username = "azureadmin"

  network_interface_ids = [
    azurerm_network_interface.vm.id
  ]

  identity {
    type = "UserAssigned"

    identity_ids = [
      azurerm_user_assigned_identity.viewer.id,
      azurerm_user_assigned_identity.operator.id,
      azurerm_user_assigned_identity.administrator.id,
    ]
  }

  disable_password_authentication = true

  admin_ssh_key {
    username = "azureadmin"

    public_key = file(
      "${path.module}/keys/secure-multicloud-azure.pub"
    )
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server-arm64"
    version   = "latest"
  }

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "academic"
  }
}
