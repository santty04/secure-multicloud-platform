from botocore.exceptions import BotoCoreError, ClientError

from app.cloud.aws.auth import assume_role_session
from app.cloud.aws.errors import raise_safe_aws_error
from app.core.config import settings


def get_instance_name(instance: dict) -> str:
    """Return the EC2 Name tag or the instance ID when no Name tag exists."""
    for tag in instance.get("Tags", []):
        if tag.get("Key") == "Name":
            return tag.get("Value", instance["InstanceId"])

    return instance["InstanceId"]


def list_instances(
    role_code: str,
) -> list[dict[str, str | None]]:
    """
    List AWS EC2 instances managed by Secure Multicloud Platform.

    Only instances tagged as belonging to the project and dev
    environment are returned.

    AWS SDK errors are translated into sanitized application errors
    before leaving the cloud service layer.
    """
    try:
        session = assume_role_session(role_code)

        ec2_client = session.client(
            "ec2",
            region_name=settings.aws_region,
        )

        response = ec2_client.describe_instances(
            Filters=[
                {
                    "Name": "tag:project",
                    "Values": ["secure-multicloud"],
                },
                {
                    "Name": "tag:environment",
                    "Values": ["dev"],
                },
            ]
        )

        instances: list[dict[str, str | None]] = []

        for reservation in response.get("Reservations", []):
            for instance in reservation.get("Instances", []):
                instances.append(
                    {
                        "instance_id": instance.get("InstanceId"),
                        "name": get_instance_name(instance),
                        "state": instance.get("State", {}).get("Name"),
                        "instance_type": instance.get("InstanceType"),
                        "private_ip": instance.get("PrivateIpAddress"),
                        "provider": "aws",
                        "region": settings.aws_region,
                    }
                )

        return instances

    except (BotoCoreError, ClientError) as exc:
        raise_safe_aws_error(exc)


def get_instance_state(
    instance_id: str,
    role_code: str,
) -> str | None:
    """
    Return the current state of a managed AWS EC2 instance.

    The lookup is restricted to instances tagged as belonging to
    Secure Multicloud Platform and the dev environment.

    Returns None when the instance does not exist or is outside
    the managed project scope.

    AWS SDK errors are translated into sanitized application errors
    before leaving the cloud service layer.
    """
    try:
        session = assume_role_session(role_code)

        ec2_client = session.client(
            "ec2",
            region_name=settings.aws_region,
        )

        response = ec2_client.describe_instances(
            Filters=[
                {
                    "Name": "instance-id",
                    "Values": [instance_id],
                },
                {
                    "Name": "tag:project",
                    "Values": ["secure-multicloud"],
                },
                {
                    "Name": "tag:environment",
                    "Values": ["dev"],
                },
            ]
        )

        for reservation in response.get("Reservations", []):
            for instance in reservation.get("Instances", []):
                if instance.get("InstanceId") == instance_id:
                    return instance.get("State", {}).get("Name")

        return None

    except (BotoCoreError, ClientError) as exc:
        raise_safe_aws_error(exc)


def start_instance(
    instance_id: str,
    role_code: str,
) -> None:
    """
    Start an AWS EC2 instance using the IAM role associated
    with the authenticated application role.

    Raw boto3/botocore exceptions are translated into sanitized
    application errors before leaving the cloud service layer.
    """
    try:
        session = assume_role_session(role_code)

        ec2_client = session.client(
            "ec2",
            region_name=settings.aws_region,
        )

        ec2_client.start_instances(
            InstanceIds=[instance_id],
        )

    except (BotoCoreError, ClientError) as exc:
        raise_safe_aws_error(exc)


def stop_instance(
    instance_id: str,
    role_code: str,
) -> None:
    """
    Stop an AWS EC2 instance using the IAM role associated
    with the authenticated application role.

    Raw boto3/botocore exceptions are translated into sanitized
    application errors before leaving the cloud service layer.
    """
    try:
        session = assume_role_session(role_code)

        ec2_client = session.client(
            "ec2",
            region_name=settings.aws_region,
        )

        ec2_client.stop_instances(
            InstanceIds=[instance_id],
        )

    except (BotoCoreError, ClientError) as exc:
        raise_safe_aws_error(exc)
