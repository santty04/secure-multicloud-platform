from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_version: str = "0.1.0"
    app_name: str = "Secure Multicloud Platform API"
    debug: bool = False

    cors_allowed_origins: list[str] = Field(default_factory=list)

    # ============================================================
    # DATABASE
    # ============================================================

    # Local development / tests
    database_url: str | None = None
    test_database_url: str | None = None

    # Azure PostgreSQL
    database_host: str | None = None
    database_port: int = 5432
    database_name: str = "secure_multicloud"
    database_user: str = "id-smp-backend-dev"
    database_application_user: str = "id-smp-backend-dev"
    database_application_principal_id: str | None = None

    # ============================================================
    # AUTH
    # ============================================================

    secret_key: str
    access_token_expire_minutes: int = 30
    jwt_algorithm: str = "HS256"

    # ============================================================
    # AZURE
    # ============================================================

    azure_subscription_id: str | None = None
    azure_write_enabled: bool = False

    azure_viewer_client_id: str | None = None
    azure_operator_client_id: str | None = None
    azure_administrator_client_id: str | None = None
    azure_resource_group: str | None = None
    azure_managed_subnet_id: str | None = None
    azure_default_vm_size: str = "Standard_B2pts_v2"
    azure_default_location: str = "centralus"
    azure_default_admin_username: str = "azureadmin"
    azure_default_ssh_public_key: str | None = None

    azure_max_managed_vms: int = 2

    # ============================================================
    # AWS
    # ============================================================

    aws_region: str = "us-east-2"
    aws_write_enabled: bool = False

    aws_backend_execution_role_arn: str | None = None
    aws_viewer_role_arn: str | None = None
    aws_operator_role_arn: str | None = None
    aws_administrator_role_arn: str | None = None

    aws_ami_id: str | None = None
    aws_subnet_id: str | None = None
    aws_security_group_id: str | None = None
    aws_instance_type: str = "t3.micro"
    aws_root_volume_size_gb: int = 8

    # ============================================================
    # AWS FEDERATION FROM AZURE
    # ============================================================

    aws_federation_audience: str | None = None
    azure_managed_identity_client_id: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
