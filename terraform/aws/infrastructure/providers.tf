provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      project     = "secure-multicloud"
      environment = "dev"
      managed_by  = "terraform"
      purpose     = "academic"
    }
  }
}
