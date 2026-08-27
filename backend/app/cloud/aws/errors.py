from typing import NoReturn

from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    EndpointConnectionError,
    NoCredentialsError,
)


class AWSCloudError(RuntimeError):
    """Safe AWS error that can be recorded without leaking SDK details."""

    def __init__(
        self,
        *,
        code: str,
        message: str,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def raise_safe_aws_error(exc: Exception) -> NoReturn:
    """
    Translate boto3/botocore exceptions into sanitized application errors.

    Raw AWS exception messages, ARNs, request IDs, temporary credentials,
    and other provider details must not be exposed to API consumers or
    persisted in application audit records.
    """

    if isinstance(exc, NoCredentialsError):
        raise AWSCloudError(
            code="aws_credentials_unavailable",
            message="AWS credentials are unavailable.",
        ) from exc

    if isinstance(exc, EndpointConnectionError):
        raise AWSCloudError(
            code="aws_endpoint_unavailable",
            message="AWS service endpoint is unavailable.",
        ) from exc

    if isinstance(exc, ClientError):
        aws_error_code = exc.response.get(
            "Error",
            {},
        ).get(
            "Code",
            "Unknown",
        )

        if aws_error_code in {
            "AccessDenied",
            "AccessDeniedException",
            "UnauthorizedOperation",
        }:
            raise AWSCloudError(
                code="aws_access_denied",
                message="AWS denied the requested operation.",
            ) from exc

        if aws_error_code == "InvalidInstanceID.NotFound":
            raise AWSCloudError(
                code="aws_instance_not_found",
                message="AWS EC2 instance was not found.",
            ) from exc

        if aws_error_code == "IncorrectInstanceState":
            raise AWSCloudError(
                code="aws_invalid_instance_state",
                message="AWS EC2 instance is not in a valid state for this operation.",
            ) from exc

        raise AWSCloudError(
            code="aws_client_error",
            message="AWS rejected the requested operation.",
        ) from exc

    if isinstance(exc, BotoCoreError):
        raise AWSCloudError(
            code="aws_sdk_error",
            message="AWS SDK communication failed.",
        ) from exc

    raise AWSCloudError(
        code="aws_unexpected_error",
        message="Unexpected AWS operation failure.",
    ) from exc
