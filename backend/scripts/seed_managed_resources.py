from sqlalchemy import select

from app.db.models import ManagedResource
from app.db.session import SessionLocal

DEMO_RESOURCES = [
    {
        "provider": "azure",
        "cloud_resource_id": (
            "/subscriptions/demo-subscription/"
            "resourceGroups/rg-secure-multicloud-demo/"
            "providers/Microsoft.Compute/"
            "virtualMachines/demo-azure-vm-01"
        ),
        "name": "demo-azure-vm-01",
        "resource_type": "virtual_machine",
        "region": "eastus2",
        "environment": "demo",
        "status": "stopped",
    },
    {
        "provider": "aws",
        "cloud_resource_id": "i-demo000000000001",
        "name": "demo-aws-ec2-01",
        "resource_type": "virtual_machine",
        "region": "us-east-1",
        "environment": "demo",
        "status": "stopped",
    },
]


def seed_managed_resources() -> None:
    with SessionLocal() as db:
        for resource_data in DEMO_RESOURCES:
            statement = select(ManagedResource).where(
                ManagedResource.provider == resource_data["provider"],
                ManagedResource.cloud_resource_id == resource_data["cloud_resource_id"],
            )

            resource = db.scalar(statement)

            if resource is None:
                resource = ManagedResource(**resource_data)
                db.add(resource)
            else:
                resource.name = resource_data["name"]
                resource.resource_type = resource_data["resource_type"]
                resource.region = resource_data["region"]
                resource.environment = resource_data["environment"]
                resource.status = resource_data["status"]
                resource.is_managed = True

        db.commit()

    print("Managed demo resources loaded successfully.")


if __name__ == "__main__":
    seed_managed_resources()
