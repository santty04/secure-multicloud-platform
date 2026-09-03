import logging

from azure.core.exceptions import AzureError
from azure.mgmt.compute import ComputeManagementClient
from azure.mgmt.network import NetworkManagementClient

from app.cloud.azure.auth import get_azure_credential
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_azure_compute_client(
    role_code: str,
) -> ComputeManagementClient:
    if not settings.azure_subscription_id:
        raise RuntimeError(
            "AZURE_SUBSCRIPTION_ID is not configured."
        )

    credential = get_azure_credential(role_code)

    return ComputeManagementClient(
        credential=credential,
        subscription_id=settings.azure_subscription_id,
    )


def get_azure_network_client(
    role_code: str,
) -> NetworkManagementClient:
    if not settings.azure_subscription_id:
        raise RuntimeError(
            "AZURE_SUBSCRIPTION_ID is not configured."
        )

    credential = get_azure_credential(role_code)

    return NetworkManagementClient(
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
    role_code: str,
):
    resource_group_name, vm_name = (
        parse_virtual_machine_resource_id(
            cloud_resource_id
        )
    )

    client = get_azure_compute_client(role_code)

    return client.virtual_machines.get(
        resource_group_name=resource_group_name,
        vm_name=vm_name,
        expand="instanceView",
    )


def get_virtual_machine_power_state(
    cloud_resource_id: str,
    role_code: str,
) -> str:
    vm = get_virtual_machine(
        cloud_resource_id,
        role_code,
    )

    if vm.instance_view is None:
        return "unknown"

    for vm_status in vm.instance_view.statuses or []:
        if (
            vm_status.code
            and vm_status.code.startswith("PowerState/")
        ):
            return vm_status.code.split(
                "/",
                maxsplit=1,
            )[1]

    return "unknown"


def start_virtual_machine(
    cloud_resource_id: str,
    role_code: str,
) -> None:
    resource_group_name, vm_name = (
        parse_virtual_machine_resource_id(
            cloud_resource_id
        )
    )

    client = get_azure_compute_client(role_code)

    poller = client.virtual_machines.begin_start(
        resource_group_name=resource_group_name,
        vm_name=vm_name,
    )

    poller.result()


def stop_virtual_machine(
    cloud_resource_id: str,
    role_code: str,
) -> None:
    resource_group_name, vm_name = (
        parse_virtual_machine_resource_id(
            cloud_resource_id
        )
    )

    client = get_azure_compute_client(role_code)

    poller = client.virtual_machines.begin_deallocate(
        resource_group_name=resource_group_name,
        vm_name=vm_name,
    )

    poller.result()


def create_virtual_machine(
    *,
    name: str,
    role_code: str,
    ssh_public_key: str,
    admin_username: str = "azureadmin",
    size: str | None = None,
    location: str | None = None,
) -> str:
    if not settings.azure_resource_group:
        raise RuntimeError(
            "AZURE_RESOURCE_GROUP is not configured."
        )

    if not settings.azure_managed_subnet_id:
        raise RuntimeError(
            "AZURE_MANAGED_SUBNET_ID is not configured."
        )

    resource_group_name = settings.azure_resource_group

    vm_location = (
        location
        or settings.azure_default_location
    )

    vm_size = (
        size
        or settings.azure_default_vm_size
    )

    compute_client = get_azure_compute_client(
        role_code
    )

    network_client = get_azure_network_client(
        role_code
    )

    nic_name = f"nic-{name}"

    # ========================================================
    # CREATE NETWORK INTERFACE
    # ========================================================

    nic_parameters = {
        "location": vm_location,
        "properties": {
            "ipConfigurations": [
                {
                    "name": "ipconfig1",
                    "properties": {
                        "privateIPAllocationMethod": "Dynamic",
                        "subnet": {
                            "id": (
                                settings.azure_managed_subnet_id
                            ),
                        },
                    },
                },
            ],
        },
        "tags": {
            "project": "secure-multicloud",
            "environment": "dev",
            "managed_by": (
                "secure-multicloud-platform"
            ),
        },
    }

    nic_poller = (
        network_client.network_interfaces.begin_create_or_update(
            resource_group_name=resource_group_name,
            network_interface_name=nic_name,
            parameters=nic_parameters,
        )
    )

    nic = nic_poller.result()

    if not nic.id:
        raise RuntimeError(
            "Azure network interface creation "
            "returned no resource ID."
        )

    # ========================================================
    # CREATE VIRTUAL MACHINE
    # ========================================================

    vm_parameters = {
        "location": vm_location,
        "properties": {
            "hardwareProfile": {
                "vmSize": vm_size,
            },
            "storageProfile": {
                "imageReference": {
                    "publisher": "Canonical",
                    "offer": "ubuntu-24_04-lts",
                    "sku": "server-arm64",
                    "version": "latest",
                },
                "osDisk": {
                    "createOption": "FromImage",
                    "deleteOption": "Delete",
                    "managedDisk": {
                        "storageAccountType": (
                            "Standard_LRS"
                        ),
                    },
                },
            },
            "osProfile": {
                "computerName": name,
                "adminUsername": admin_username,
                "linuxConfiguration": {
                    "disablePasswordAuthentication": True,
                    "ssh": {
                        "publicKeys": [
                            {
                                "path": (
                                    f"/home/{admin_username}/"
                                    ".ssh/authorized_keys"
                                ),
                                "keyData": ssh_public_key,
                            },
                        ],
                    },
                },
            },
            "networkProfile": {
                "networkInterfaces": [
                    {
                        "id": nic.id,
                        "properties": {
                            "deleteOption": "Delete",
                        },
                    },
                ],
            },
        },
        "tags": {
            "project": "secure-multicloud",
            "environment": "dev",
            "managed_by": (
                "secure-multicloud-platform"
            ),
        },
    }

    try:
        vm_poller = (
            compute_client.virtual_machines.begin_create_or_update(
                resource_group_name=resource_group_name,
                vm_name=name,
                parameters=vm_parameters,
            )
        )

        vm = vm_poller.result()

    except AzureError:
        try:
            network_client.network_interfaces.begin_delete(
                resource_group_name=resource_group_name,
                network_interface_name=nic_name,
            ).result()

        except AzureError as cleanup_exc:
            logger.warning(
                "Failed to clean up Azure NIC %s "
                "after VM creation failure: %s",
                nic_name,
                cleanup_exc,
            )

        raise

    if not vm.id:
        raise RuntimeError(
            "Azure virtual machine creation "
            "returned no resource ID."
        )

    return vm.id