import boto3
from boto3.session import Session

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
        raise ValueError(f"Unsupported AWS application role: {role_code}")

    role_arn = role_arns[role_code]

    if not role_arn:
        raise RuntimeError(f"AWS role ARN is not configured for role: {role_code}")

    return role_arn


def assume_role_session(role_code: str) -> Session:
    """
    Assume the AWS IAM role associated with the application role.

    Credentials returned by AWS STS remain only in memory and are not
    persisted in the database, files, or application responses.
    """

    role_arn = get_role_arn(role_code)

    sts_client = boto3.client(
        "sts",
        region_name=settings.aws_region,
    )

    response = sts_client.assume_role(
        RoleArn=role_arn,
        RoleSessionName=f"smp-{role_code}-session",
    )

    credentials = response["Credentials"]

    return boto3.Session(
        aws_access_key_id=credentials["AccessKeyId"],
        aws_secret_access_key=credentials["SecretAccessKey"],
        aws_session_token=credentials["SessionToken"],
        region_name=settings.aws_region,
    )
