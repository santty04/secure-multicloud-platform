from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_version: str = "0.1.0"
    app_name: str = "Secure Multicloud Platform API"
    debug: bool = False

    database_url: str
    test_database_url: str

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

    # AWS federation from Azure
    aws_federation_audience: str | None = None
    azure_managed_identity_client_id: str | None = None

    # ============================================================
    # AI
    # ============================================================

    ai_provider: str = "ollama"

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:4b-instruct"
    ollama_timeout_seconds: float = 120.0

    ai_advisor_max_instances: int = 5
    ai_advisor_min_disk_size_gb: int = 8
    ai_advisor_max_disk_size_gb: int = 50

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
