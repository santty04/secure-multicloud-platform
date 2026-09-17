# ============================================================
# MANAGED WORKLOADS RESOURCE GROUP
# ============================================================

resource "azurerm_resource_group" "managed" {
  name     = "rg-${var.project_name}-managed-${var.environment}"
  location = var.location

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "managed-workloads"
  }
}

# ============================================================
# MANAGED WORKLOADS VIRTUAL NETWORK
# ============================================================

resource "azurerm_virtual_network" "managed" {
  name                = "vnet-${var.project_name}-managed-${var.environment}"
  address_space       = ["10.30.0.0/16"]
  location            = var.location
  resource_group_name = azurerm_resource_group.managed.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "managed-workloads"
  }
}

# ============================================================
# MANAGED VIRTUAL MACHINES SUBNET
# ============================================================

resource "azurerm_subnet" "managed_vm" {
  name                 = "snet-vm-${var.environment}"
  resource_group_name  = azurerm_resource_group.managed.name
  virtual_network_name = azurerm_virtual_network.managed.name
  address_prefixes     = ["10.30.1.0/24"]
}

# ============================================================
# MANAGED VIRTUAL MACHINES NSG
# ============================================================

resource "azurerm_network_security_group" "managed_vm" {
  name                = "nsg-vm-${var.environment}"
  location            = var.location
  resource_group_name = azurerm_resource_group.managed.name

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "managed-virtual-machines"
  }
}

resource "azurerm_subnet_network_security_group_association" "managed_vm" {
  subnet_id                 = azurerm_subnet.managed_vm.id
  network_security_group_id = azurerm_network_security_group.managed_vm.id
}