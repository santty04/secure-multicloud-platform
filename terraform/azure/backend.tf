terraform {
  backend "azurerm" {
    storage_account_name = "stsecuremulticloudtf01"
    container_name       = "tfstate"
    key                  = "azure/dev/terraform.tfstate"
    use_azuread_auth     = true
    use_cli              = true
  }
}