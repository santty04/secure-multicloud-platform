data "aws_caller_identity" "current" {}

# ============================================================
# VIEWER ROLE
# ============================================================

resource "aws_iam_role" "smp_viewer" {
  name        = "SMPViewerRole"
  description = "Read-only EC2 role for Secure Multicloud Platform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/secure-multicloud-terraform"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "SMPViewerRole"
    project     = "secure-multicloud"
    environment = "dev"
  }
}


# ============================================================
# OPERATOR ROLE
# ============================================================

resource "aws_iam_role" "smp_operator" {
  name        = "SMPOperatorRole"
  description = "Operational EC2 role for Secure Multicloud Platform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/secure-multicloud-terraform"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "SMPOperatorRole"
    project     = "secure-multicloud"
    environment = "dev"
  }
}


# ============================================================
# ADMINISTRATOR ROLE
# ============================================================

resource "aws_iam_role" "smp_administrator" {
  name        = "SMPAdministratorRole"
  description = "EC2 administrator role for Secure Multicloud Platform"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/secure-multicloud-terraform"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "SMPAdministratorRole"
    project     = "secure-multicloud"
    environment = "dev"
  }
}