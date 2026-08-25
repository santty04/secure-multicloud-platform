# ============================================================
# VIEWER POLICY
# ============================================================

resource "aws_iam_role_policy" "smp_viewer" {
  name = "SMPViewerPolicy"
  role = aws_iam_role.smp_viewer.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "ReadEC2Instances"
        Effect = "Allow"

        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus"
        ]

        Resource = "*"
      }
    ]
  })
}


# ============================================================
# OPERATOR POLICY
# ============================================================

resource "aws_iam_role_policy" "smp_operator" {
  name = "SMPOperatorPolicy"
  role = aws_iam_role.smp_operator.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid    = "ReadEC2Instances"
        Effect = "Allow"

        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus"
        ]

        Resource = "*"
      },

      {
        Sid    = "OperateProjectInstances"
        Effect = "Allow"

        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances"
        ]

        Resource = "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:instance/*"

        Condition = {
          StringEquals = {
            "aws:ResourceTag/project"     = "secure-multicloud"
            "aws:ResourceTag/environment" = "dev"
          }
        }
      }
    ]
  })
}


# ============================================================
# ADMINISTRATOR POLICY
# ============================================================

resource "aws_iam_role_policy" "smp_administrator" {
  name = "SMPAdministratorPolicy"
  role = aws_iam_role.smp_administrator.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [

      # ======================================================
      # READ EC2 RESOURCES
      # ======================================================

      {
        Sid    = "ReadEC2Resources"
        Effect = "Allow"

        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus",
          "ec2:DescribeImages",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups"
        ]

        Resource = "*"
      },

      # ======================================================
      # ONLY CANONICAL UBUNTU AMIs
      # ======================================================

      {
        Sid    = "UseCanonicalImages"
        Effect = "Allow"

        Action = "ec2:RunInstances"

        Resource = "arn:aws:ec2:us-east-2::image/*"

        Condition = {
          StringEquals = {
            "ec2:Owner" = "099720109477"
          }
        }
      },

      # ======================================================
      # ONLY PROJECT SUBNETS
      # ======================================================

      {
        Sid    = "UseProjectSubnets"
        Effect = "Allow"

        Action = "ec2:RunInstances"

        Resource = "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:subnet/*"

        Condition = {
          StringEquals = {
            "ec2:ResourceTag/project"     = "secure-multicloud"
            "ec2:ResourceTag/environment" = "dev"
          }
        }
      },

      # ======================================================
      # ONLY PROJECT SECURITY GROUPS
      # ======================================================

      {
        Sid    = "UseProjectSecurityGroups"
        Effect = "Allow"

        Action = "ec2:RunInstances"

        Resource = "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:security-group/*"

        Condition = {
          StringEquals = {
            "ec2:ResourceTag/project"     = "secure-multicloud"
            "ec2:ResourceTag/environment" = "dev"
          }
        }
      },

      # ======================================================
      # NETWORK INTERFACE
      # NO PUBLIC IPv4
      # ======================================================

      {
        Sid    = "CreatePrivateInstanceNetworkInterfaces"
        Effect = "Allow"

        Action = "ec2:RunInstances"

        Resource = "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:network-interface/*"

        Condition = {
          Bool = {
            "ec2:AssociatePublicIpAddress" = "false"
          }
        }
      },

      # ======================================================
      # CREATE INSTANCE
      #
      # - t3.micro only
      # - IMDSv2 required
      # - default tenancy
      # - mandatory project tags
      # ======================================================

      {
        Sid    = "CreateProjectInstances"
        Effect = "Allow"

        Action = "ec2:RunInstances"

        Resource = "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:instance/*"

        Condition = {
          StringEquals = {
            "ec2:InstanceType"           = "t3.micro"
            "ec2:MetadataHttpTokens"     = "required"
            "ec2:Tenancy"                = "default"
            "aws:RequestTag/project"     = "secure-multicloud"
            "aws:RequestTag/environment" = "dev"
          }
        }
      },

      # ======================================================
      # EBS VOLUMES
      #
      # - encryption required
      # - mandatory project tags
      # ======================================================

      {
        Sid    = "CreateEncryptedProjectVolumes"
        Effect = "Allow"

        Action = "ec2:RunInstances"

        Resource = "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:volume/*"

        Condition = {
          StringEquals = {
            "aws:RequestTag/project"     = "secure-multicloud"
            "aws:RequestTag/environment" = "dev"
          }

          Bool = {
            "ec2:Encrypted" = "true"
          }
        }
      },

      # ======================================================
      # TAG INSTANCES AND VOLUMES DURING CREATION
      # ======================================================

      {
        Sid    = "TagResourcesDuringCreation"
        Effect = "Allow"

        Action = "ec2:CreateTags"

        Resource = [
          "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:instance/*",
          "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:volume/*"
        ]

        Condition = {
          StringEquals = {
            "ec2:CreateAction"           = "RunInstances"
            "aws:RequestTag/project"     = "secure-multicloud"
            "aws:RequestTag/environment" = "dev"
          }
        }
      },

      # ======================================================
      # MANAGE EXISTING PROJECT INSTANCES
      # ======================================================

      {
        Sid    = "ManageProjectInstances"
        Effect = "Allow"

        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:TerminateInstances"
        ]

        Resource = "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:instance/*"

        Condition = {
          StringEquals = {
            "aws:ResourceTag/project"     = "secure-multicloud"
            "aws:ResourceTag/environment" = "dev"
          }
        }
      }
    ]
  })
}