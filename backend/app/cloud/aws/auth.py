import boto3
from boto3.session import Session

from app.cloud.aws.errors import AWSCloudError
from app.core.config import settings

AWS_ROLE_CODES = {
    "viewer",
    "operator",
    "administrator",
}


def get_role_arn(role_code: str) -> str:
    """Return the AWS IAM role ARN associated with an application role."""

    role_arns = {
        "viewer": settings.aws_viewer_role_arn,
        "operator": settings.aws_operator_role_arn,
        "administrator": settings.aws_administrator_role_arn,
    }

    if role_code not in AWS_ROLE_CODES:
        raise AWSCloudError(
            code="aws_role_not_supported",
            message="The requested AWS application role is not supported.",
        )

    role_arn = role_arns[role_code]

    if not role_arn:
        raise AWSCloudError(
            code="aws_configuration_error",
            message="The AWS platform role is not configured.",
        )

    return role_arn


def assume_role_session(role_code: str) -> Session:
    """
    Create an AWS session through the platform two-step STS chain.

    Development flow:

        Base AWS identity
            -> SMPBackendExecutionRole
            -> Viewer / Operator / Administrator role

    All STS credentials remain temporary and in memory only.
    """

    backend_role_arn = settings.aws_backend_execution_role_arn

    if not backend_role_arn:
        raise AWSCloudError(
            code="aws_configuration_error",
            message="The AWS backend execution role is not configured.",
        )

    platform_role_arn = get_role_arn(role_code)

    # ============================================================
    # STEP 1
    # Base identity -> SMPBackendExecutionRole
    # ============================================================

    base_session = boto3.Session(
        region_name=settings.aws_region,
    )

    base_sts_client = base_session.client(
        "sts",
        region_name=settings.aws_region,
    )

    backend_response = base_sts_client.assume_role(
        RoleArn=backend_role_arn,
        RoleSessionName="smp-backend-session",
    )

    backend_credentials = backend_response["Credentials"]

    backend_session = boto3.Session(
        aws_access_key_id=backend_credentials["AccessKeyId"],
        aws_secret_access_key=backend_credentials["SecretAccessKey"],
        aws_session_token=backend_credentials["SessionToken"],
        region_name=settings.aws_region,
    )

    # ============================================================
    # STEP 2
    # SMPBackendExecutionRole -> application platform role
    # ============================================================

    backend_sts_client = backend_session.client(
        "sts",
        region_name=settings.aws_region,
    )

    platform_response = backend_sts_client.assume_role(
        RoleArn=platform_role_arn,
        RoleSessionName=f"smp-{role_code}-session",
    )

    platform_credentials = platform_response["Credentials"]

    # ============================================================
    # FINAL SESSION
    # Used by EC2 operations
    # ============================================================

    return boto3.Session(
        aws_access_key_id=platform_credentials["AccessKeyId"],
        aws_secret_access_key=platform_credentials["SecretAccessKey"],
        aws_session_token=platform_credentials["SessionToken"],
        region_name=settings.aws_region,
    )
