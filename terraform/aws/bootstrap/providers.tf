provider "aws" {
  region = "us-east-2"

  default_tags {
    tags = {
      project     = "secure-multicloud"
      environment = "dev"
      managed_by  = "terraform"
      purpose     = "terraform-state"
    }
  }
}
