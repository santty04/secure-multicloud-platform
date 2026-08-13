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