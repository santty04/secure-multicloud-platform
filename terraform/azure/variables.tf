variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "secure-multicloud"
}

variable "environment" {
  description = "Entorno de despliegue"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Region de Azure donde se desplegara la infraestructura"
  type        = string
  default     = "centralus"
}
