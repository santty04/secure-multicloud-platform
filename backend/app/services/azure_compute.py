from azure.identity import AzureCliCredential
from azure.mgmt.compute import ComputeManagementClient

from app.core.config import settings


def get_azure_compute_client() -> ComputeManagementClient:
    if not settings.azure_subscription_id:
        raise RuntimeError(
            "AZURE_SUBSCRIPTION_ID is not configured."
        )

    credential = AzureCliCredential()

    return ComputeManagementClient(
        credential=credential,
        subscription_id=settings.azure_subscription_id,
    )


def parse_virtual_machine_resource_id(
    resource_id: str,
) -> tuple[str, str]:
    parts = [
        part
        for part in resource_id.strip("/").split("/")
        if part
    ]

    normalized_parts = [
        part.lower()
        for part in parts
    ]

    try:
        resource_group_index = normalized_parts.index(
            "resourcegroups"
        )
        virtual_machine_index = normalized_parts.index(
            "virtualmachines"
        )

        resource_group_name = parts[
            resource_group_index + 1
        ]
        vm_name = parts[
            virtual_machine_index + 1
        ]
    except (ValueError, IndexError) as exc:
        raise ValueError(
            "Invalid Azure virtual machine resource ID."
        ) from exc

    return resource_group_name, vm_name


def get_virtual_machine(
    cloud_resource_id: str,
):
    resource_group_name, vm_name = (
        parse_virtual_machine_resource_id(
            cloud_resource_id
        )
    )

    client = get_azure_compute_client()

    return client.virtual_machines.get(
        resource_group_name=resource_group_name,
        vm_name=vm_name,
        expand="instanceView",
    )


def get_virtual_machine_power_state(
    cloud_resource_id: str,
) -> str:
    vm = get_virtual_machine(cloud_resource_id)

    if vm.instance_view is None:
        return "unknown"

    for vm_status in vm.instance_view.statuses or []:
        if (
            vm_status.code
            and vm_status.code.startswith(
                "PowerState/"
            )
        ):
            return vm_status.code.split(
                "/",
                maxsplit=1,
            )[1]

    return "unknown"

def start_virtual_machine(
    cloud_resource_id: str,
) -> None:
    resource_group_name, vm_name = (
        parse_virtual_machine_resource_id(
            cloud_resource_id
        )
    )

    client = get_azure_compute_client()

    poller = client.virtual_machines.begin_start(
        resource_group_name=resource_group_name,
        vm_name=vm_name,
    )

    poller.result()

def stop_virtual_machine(
    cloud_resource_id: str,
) -> None:
    resource_group_name, vm_name = (
        parse_virtual_machine_resource_id(
            cloud_resource_id
        )
    )

    client = get_azure_compute_client()

    poller = client.virtual_machines.begin_deallocate(
        resource_group_name=resource_group_name,
        vm_name=vm_name,
    )

    poller.result()