variable "location" {
  description = "Azure region where project resources will be deployed"
  type        = string
  default     = "eastus"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "secure-multicloud"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "vnet_address_space" {
  description = "Address space used by the Azure virtual network"
  type        = list(string)
  default     = ["10.10.0.0/16"]
}

variable "subnet_address_prefixes" {
  description = "Address prefixes used by the application subnet"
  type        = list(string)
  default     = ["10.10.1.0/24"]
}