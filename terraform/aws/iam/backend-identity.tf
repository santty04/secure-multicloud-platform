# ============================================================
# BACKEND EXECUTION ROLE
# ============================================================

resource "aws_iam_role" "smp_backend_execution" {
  name        = "SMPBackendExecutionRole"
  description = "Execution identity used by the Secure Multicloud Platform backend"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "AllowLocalDevelopmentIdentity"
        Effect = "Allow"

        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/secure-multicloud-terraform"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "SMPBackendExecutionRole"
    project     = "secure-multicloud"
    environment = "dev"
    purpose     = "backend-execution"
  }
}


# ============================================================
# BACKEND ASSUME PLATFORM ROLES POLICY
# ============================================================

resource "aws_iam_role_policy" "smp_backend_execution" {
  name = "SMPBackendAssumePlatformRoles"
  role = aws_iam_role.smp_backend_execution.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "AssumePlatformRoles"
        Effect = "Allow"

        Action = [
          "sts:AssumeRole"
        ]

        Resource = [
          aws_iam_role.smp_viewer.arn,
          aws_iam_role.smp_operator.arn,
          aws_iam_role.smp_administrator.arn
        ]
      }
    ]
  })
}
