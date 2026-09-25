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

variable "backend_secret_key" {
  description = "JWT signing secret for the deployed backend"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend API key used by the backend to send account activation emails"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ollama_cf_access_client_id" {
  description = "Cloudflare Access Client ID used by the backend to reach Ollama."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ollama_cf_access_client_secret" {
  description = "Cloudflare Access Client Secret used by the backend to reach Ollama."
  type        = string
  sensitive   = true
  default     = ""
}
