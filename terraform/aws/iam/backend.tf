terraform {
  backend "s3" {
    bucket       = "secure-multicloud-tfstate-2026-daniel"
    key          = "dev/aws/iam/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}
