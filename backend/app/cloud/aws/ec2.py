from botocore.exceptions import BotoCoreError, ClientError

from app.cloud.aws.auth import assume_role_session
from app.cloud.aws.errors import AWSCloudError, raise_safe_aws_error
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
                {
                    "Name": "instance-state-name",
                    "Values": [
                        "pending",
                        "running",
                        "stopping",
                        "stopped",
                    ],
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


def get_instance_state_by_id(
    instance_id: str,
    role_code: str,
) -> str | None:
    """
    Return the current EC2 state for an exact instance ID.

    This lookup intentionally does not filter by project tags.
    It is used to distinguish an instance that no longer exists
    from an existing instance that is outside the managed tag scope.

    Returns None only when AWS reports that the instance does not exist.
    """
    try:
        session = assume_role_session(role_code)

        ec2_client = session.client(
            "ec2",
            region_name=settings.aws_region,
        )

        response = ec2_client.describe_instances(
            InstanceIds=[instance_id],
        )

        for reservation in response.get("Reservations", []):
            for instance in reservation.get("Instances", []):
                if instance.get("InstanceId") == instance_id:
                    return instance.get("State", {}).get("Name")

        return None

    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")

        if error_code == "InvalidInstanceID.NotFound":
            return None

        raise_safe_aws_error(exc)

    except BotoCoreError as exc:
        raise_safe_aws_error(exc)


def create_instance(
    *,
    name: str,
    role_code: str,
    client_token: str,
) -> str:
    """
    Create a securely configured AWS EC2 instance.

    Security-sensitive infrastructure parameters are controlled
    by backend configuration rather than supplied by the user.

    Returns the created EC2 instance ID.
    """
    if not settings.aws_ami_id:
        raise AWSCloudError(
            code="aws_configuration_error",
            message="AWS AMI configuration is unavailable.",
        )

    if not settings.aws_subnet_id:
        raise AWSCloudError(
            code="aws_configuration_error",
            message="AWS subnet configuration is unavailable.",
        )

    if not settings.aws_security_group_id:
        raise AWSCloudError(
            code="aws_configuration_error",
            message="AWS security group configuration is unavailable.",
        )

    try:
        session = assume_role_session(role_code)

        ec2_client = session.client(
            "ec2",
            region_name=settings.aws_region,
        )

        response = ec2_client.run_instances(
            ClientToken=client_token,
            ImageId=settings.aws_ami_id,
            InstanceType=settings.aws_instance_type,
            MinCount=1,
            MaxCount=1,
            NetworkInterfaces=[
                {
                    "DeviceIndex": 0,
                    "SubnetId": settings.aws_subnet_id,
                    "Groups": [
                        settings.aws_security_group_id,
                    ],
                    "AssociatePublicIpAddress": False,
                }
            ],
            MetadataOptions={
                "HttpEndpoint": "enabled",
                "HttpTokens": "required",
                "HttpPutResponseHopLimit": 1,
            },
            BlockDeviceMappings=[
                {
                    "DeviceName": "/dev/sda1",
                    "Ebs": {
                        "VolumeSize": settings.aws_root_volume_size_gb,
                        "VolumeType": "gp3",
                        "Encrypted": True,
                        "DeleteOnTermination": True,
                    },
                }
            ],
            TagSpecifications=[
                {
                    "ResourceType": "instance",
                    "Tags": [
                        {
                            "Key": "Name",
                            "Value": name,
                        },
                        {
                            "Key": "project",
                            "Value": "secure-multicloud",
                        },
                        {
                            "Key": "environment",
                            "Value": "dev",
                        },
                        {
                            "Key": "managed_by",
                            "Value": "secure-multicloud-platform",
                        },
                    ],
                },
                {
                    "ResourceType": "volume",
                    "Tags": [
                        {
                            "Key": "project",
                            "Value": "secure-multicloud",
                        },
                        {
                            "Key": "environment",
                            "Value": "dev",
                        },
                        {
                            "Key": "managed_by",
                            "Value": "secure-multicloud-platform",
                        },
                    ],
                },
            ],
        )

        instances = response.get("Instances", [])

        if not instances:
            raise AWSCloudError(
                code="aws_create_failed",
                message="AWS did not return a created EC2 instance.",
            )

        instance_id = instances[0].get("InstanceId")

        if not instance_id:
            raise AWSCloudError(
                code="aws_create_failed",
                message="AWS did not return an EC2 instance identifier.",
            )

        return instance_id

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


def terminate_instance(
    instance_id: str,
    role_code: str,
) -> None:
    """
    Terminate an AWS EC2 instance using the IAM role associated
    with the authenticated application role.

    AWS SDK errors are translated into sanitized application errors
    before leaving the cloud service layer.
    """
    try:
        session = assume_role_session(role_code)

        ec2_client = session.client(
            "ec2",
            region_name=settings.aws_region,
        )

        ec2_client.terminate_instances(
            InstanceIds=[instance_id],
        )

    except (BotoCoreError, ClientError) as exc:
        raise_safe_aws_error(exc)
