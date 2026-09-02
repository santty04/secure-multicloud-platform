import os
from typing import Any

import boto3
import httpx
from boto3.session import Session
from botocore import UNSIGNED
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.cloud.aws.errors import AWSCloudError
from app.core.config import settings

AZURE_IDENTITY_API_VERSION = "2019-08-01"
AZURE_IDENTITY_TIMEOUT_SECONDS = 10.0


def azure_managed_identity_available() -> bool:
    """
    Return True when the application is running in an Azure workload
    that exposes the Managed Identity token endpoint.

    Azure Container Apps provides IDENTITY_ENDPOINT and IDENTITY_HEADER
    automatically when Managed Identity is enabled.
    """

    return bool(os.getenv("IDENTITY_ENDPOINT") and os.getenv("IDENTITY_HEADER"))


def _get_azure_managed_identity_token() -> str:
    """
    Obtain an Entra ID access token from the Azure Managed Identity
    endpoint for the audience trusted by AWS.

    No AWS credentials or Azure client secrets are required.
    """

    identity_endpoint = os.getenv("IDENTITY_ENDPOINT")
    identity_header = os.getenv("IDENTITY_HEADER")

    if not identity_endpoint or not identity_header:
        raise AWSCloudError(
            code="azure_managed_identity_unavailable",
            message="Azure Managed Identity is not available.",
        )

    if not settings.aws_federation_audience:
        raise AWSCloudError(
            code="aws_federation_configuration_error",
            message="The AWS federation audience is not configured.",
        )

    if not settings.azure_managed_identity_client_id:
        raise AWSCloudError(
            code="azure_managed_identity_configuration_error",
            message="The Azure Managed Identity client ID is not configured.",
        )

    params = {
        "resource": settings.aws_federation_audience,
        "api-version": AZURE_IDENTITY_API_VERSION,
        "client_id": settings.azure_managed_identity_client_id,
    }

    headers = {
        "X-IDENTITY-HEADER": identity_header,
    }

    try:
        response = httpx.get(
            identity_endpoint,
            params=params,
            headers=headers,
            timeout=AZURE_IDENTITY_TIMEOUT_SECONDS,
        )

        response.raise_for_status()

    except httpx.HTTPError as exc:
        raise AWSCloudError(
            code="azure_managed_identity_token_error",
            message="Unable to obtain the Azure Managed Identity token.",
        ) from exc

    try:
        payload: dict[str, Any] = response.json()
    except ValueError as exc:
        raise AWSCloudError(
            code="azure_managed_identity_invalid_response",
            message="Azure Managed Identity returned an invalid response.",
        ) from exc

    access_token = payload.get("access_token")

    if not isinstance(access_token, str) or not access_token:
        raise AWSCloudError(
            code="azure_managed_identity_invalid_token",
            message="Azure Managed Identity did not return a valid access token.",
        )

    return access_token


def assume_backend_role_with_azure_identity() -> Session:
    """
    Exchange an Azure Managed Identity token for temporary AWS
    credentials using AWS STS AssumeRoleWithWebIdentity.

    Flow:

        Azure Container App
            -> Azure Managed Identity
            -> Microsoft Entra ID access token
            -> AWS STS AssumeRoleWithWebIdentity
            -> SMPBackendExecutionRole

    The resulting AWS credentials are temporary and remain in memory.
    """

    backend_role_arn = settings.aws_backend_execution_role_arn

    if not backend_role_arn:
        raise AWSCloudError(
            code="aws_configuration_error",
            message="The AWS backend execution role is not configured.",
        )

    web_identity_token = _get_azure_managed_identity_token()

    # AssumeRoleWithWebIdentity does not require pre-existing AWS
    # credentials. The request is authenticated using the OIDC token.
    sts_client = boto3.client(
        "sts",
        region_name=settings.aws_region,
        config=Config(signature_version=UNSIGNED),
    )

    try:
        response = sts_client.assume_role_with_web_identity(
            RoleArn=backend_role_arn,
            RoleSessionName="smp-azure-backend",
            WebIdentityToken=web_identity_token,
        )

    except (BotoCoreError, ClientError) as exc:
        raise AWSCloudError(
            code="aws_federation_error",
            message="AWS rejected the Azure workload identity.",
        ) from exc

    credentials = response.get("Credentials")

    if not isinstance(credentials, dict):
        raise AWSCloudError(
            code="aws_federation_invalid_response",
            message="AWS STS did not return temporary credentials.",
        )

    required_fields = {
        "AccessKeyId",
        "SecretAccessKey",
        "SessionToken",
    }

    if not required_fields.issubset(credentials):
        raise AWSCloudError(
            code="aws_federation_invalid_credentials",
            message="AWS STS returned incomplete temporary credentials.",
        )

    return boto3.Session(
        aws_access_key_id=credentials["AccessKeyId"],
        aws_secret_access_key=credentials["SecretAccessKey"],
        aws_session_token=credentials["SessionToken"],
        region_name=settings.aws_region,
    )
