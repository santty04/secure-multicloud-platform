provider "aws" {
  region  = "us-east-2"
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
