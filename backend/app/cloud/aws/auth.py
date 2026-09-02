import boto3
from boto3.session import Session
from botocore.exceptions import BotoCoreError, ClientError

from app.cloud.aws.errors import AWSCloudError
from app.cloud.aws.federation import (
    assume_backend_role_with_azure_identity,
    azure_managed_identity_available,
)
from app.core.config import settings

AWS_ROLE_CODES = {
    "viewer",
    "operator",
    "administrator",
}


def get_role_arn(role_code: str) -> str:
    """
    Return the AWS IAM role ARN associated with an application role.
    """

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


def _assume_backend_role_from_development_identity() -> Session:
    """
    Obtain the backend execution role while the backend is running
    outside Azure.

    This path exists only for development and controlled E2E execution
    before the backend is deployed to Azure.

    Flow:

        Development AWS identity
            -> SMPBackendExecutionRole
    """

    backend_role_arn = settings.aws_backend_execution_role_arn

    if not backend_role_arn:
        raise AWSCloudError(
            code="aws_configuration_error",
            message="The AWS backend execution role is not configured.",
        )

    try:
        base_session = boto3.Session(
            region_name=settings.aws_region,
        )

        base_sts_client = base_session.client(
            "sts",
            region_name=settings.aws_region,
        )

        backend_response = base_sts_client.assume_role(
            RoleArn=backend_role_arn,
            RoleSessionName="smp-development-backend",
        )

    except (BotoCoreError, ClientError) as exc:
        raise AWSCloudError(
            code="aws_backend_role_assumption_error",
            message="Unable to assume the AWS backend execution role.",
        ) from exc

    backend_credentials = backend_response.get("Credentials")

    if not isinstance(backend_credentials, dict):
        raise AWSCloudError(
            code="aws_backend_role_invalid_response",
            message="AWS STS did not return backend execution credentials.",
        )

    required_fields = {
        "AccessKeyId",
        "SecretAccessKey",
        "SessionToken",
    }

    if not required_fields.issubset(backend_credentials):
        raise AWSCloudError(
            code="aws_backend_role_invalid_credentials",
            message="AWS STS returned incomplete backend credentials.",
        )

    return boto3.Session(
        aws_access_key_id=backend_credentials["AccessKeyId"],
        aws_secret_access_key=backend_credentials["SecretAccessKey"],
        aws_session_token=backend_credentials["SessionToken"],
        region_name=settings.aws_region,
    )


def _get_backend_execution_session() -> Session:
    """
    Return the SMPBackendExecutionRole session.

    Azure:
        Managed Identity
            -> Entra ID
            -> AssumeRoleWithWebIdentity
            -> SMPBackendExecutionRole

    Outside Azure:
        Development AWS identity
            -> AssumeRole
            -> SMPBackendExecutionRole

    When Azure Managed Identity is detected, the application MUST use
    workload identity federation. It never falls back to developer AWS
    credentials if federation fails.
    """

    if azure_managed_identity_available():
        return assume_backend_role_with_azure_identity()

    return _assume_backend_role_from_development_identity()


def assume_role_session(role_code: str) -> Session:
    """
    Create an AWS session using the application RBAC role.

    Production flow:

        Azure Managed Identity
            -> SMPBackendExecutionRole
            -> Viewer / Operator / Administrator

    Development flow:

        Development AWS identity
            -> SMPBackendExecutionRole
            -> Viewer / Operator / Administrator

    The application user's JWT determines which final platform role
    may be assumed.

    All AWS credentials remain temporary and in memory.
    """

    platform_role_arn = get_role_arn(role_code)

    # ============================================================
    # STEP 1
    # Obtain SMPBackendExecutionRole
    # ============================================================

    backend_session = _get_backend_execution_session()

    # ============================================================
    # STEP 2
    # SMPBackendExecutionRole -> application RBAC platform role
    # ============================================================

    try:
        backend_sts_client = backend_session.client(
            "sts",
            region_name=settings.aws_region,
        )

        platform_response = backend_sts_client.assume_role(
            RoleArn=platform_role_arn,
            RoleSessionName=f"smp-{role_code}-session",
        )

    except (BotoCoreError, ClientError) as exc:
        raise AWSCloudError(
            code="aws_platform_role_assumption_error",
            message="Unable to assume the AWS application platform role.",
        ) from exc

    platform_credentials = platform_response.get("Credentials")

    if not isinstance(platform_credentials, dict):
        raise AWSCloudError(
            code="aws_platform_role_invalid_response",
            message="AWS STS did not return platform role credentials.",
        )

    required_fields = {
        "AccessKeyId",
        "SecretAccessKey",
        "SessionToken",
    }

    if not required_fields.issubset(platform_credentials):
        raise AWSCloudError(
            code="aws_platform_role_invalid_credentials",
            message="AWS STS returned incomplete platform role credentials.",
        )

    # ============================================================
    # FINAL SESSION
    # EC2 operations execute using the role allowed by application RBAC
    # ============================================================

    return boto3.Session(
        aws_access_key_id=platform_credentials["AccessKeyId"],
        aws_secret_access_key=platform_credentials["SecretAccessKey"],
        aws_session_token=platform_credentials["SessionToken"],
        region_name=settings.aws_region,
    )
