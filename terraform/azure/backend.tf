terraform {
  backend "azurerm" {
    resource_group_name  = "rg-secure-multicloud-tfstate"
    storage_account_name = "stsecuremulticloudtf02"
    container_name       = "tfstate"
    key                  = "azure/dev/terraform.tfstate"

    use_azuread_auth = true
    use_cli          = true
  }
}