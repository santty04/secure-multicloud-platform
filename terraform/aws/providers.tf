provider "aws" {
  region  = var.aws_region
  profile = "secure-multicloud"

  default_tags {
    tags = {
      project     = "secure-multicloud"
      environment = "dev"
      managed_by  = "terraform"
      purpose     = "academic"
    }
  }
}