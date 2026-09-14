from typing import Any

from app.core.config import settings

INFRASTRUCTURE_CATALOG: dict[str, dict[str, Any]] = {
    "aws": {
        "regions": [
            "us-east-2",
        ],
        "instance_types": [
            "t3.micro",
            "t3.small",
            "t3.medium",
        ],
        "disk_types": [
            "gp3",
        ],
        "public_ip_allowed": False,
        "max_instances": settings.ai_advisor_max_instances,
        "min_disk_size_gb": settings.ai_advisor_min_disk_size_gb,
        "max_disk_size_gb": settings.ai_advisor_max_disk_size_gb,
    },
    "azure": {
        "regions": [
            "centralus",
        ],
        "instance_types": [
            "Standard_B2pts_v2",
        ],
        "disk_types": [
            "Standard_LRS",
        ],
        "public_ip_allowed": False,
        "max_instances": settings.ai_advisor_max_instances,
        "min_disk_size_gb": max(
            30,
            settings.ai_advisor_min_disk_size_gb,
        ),
        "max_disk_size_gb": settings.ai_advisor_max_disk_size_gb,
    },
}


def get_infrastructure_catalog() -> dict[str, dict[str, Any]]:
    """
    Return the infrastructure catalog that the AI advisor is allowed
    to recommend.

    This is a platform policy boundary. AI output never expands it.
    """

    return INFRASTRUCTURE_CATALOG
