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

    # Second factor: a one-time code emailed after the password check.
    mfa_enabled: bool = False
    login_code_expire_minutes: int = 5
    login_code_max_attempts: int = 5
    login_code_max_sends: int = 3
    login_code_resend_cooldown_seconds: int = 30

    # Per-account lockout: this many failed passwords or codes within the
    # window block further sign-in attempts until the window slides past.
    login_max_failures: int = 10
    login_lockout_window_minutes: int = 15

    # ============================================================
    # EMAIL (Resend)
    # ============================================================

    resend_api_key: str | None = None
    email_from_address: str = "no-reply@example.com"
    email_from_name: str = "Secure Multicloud Platform"
    frontend_base_url: str = "http://localhost:3000"
    password_setup_token_expire_hours: int = 48

    # "Forgot password": reset links are short-lived, and each address can
    # only request a few of them per window so the endpoint cannot be used to
    # flood someone's inbox.
    password_reset_token_expire_minutes: int = 30
    password_reset_max_requests: int = 3
    password_reset_window_minutes: int = 60

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

    # AI Infrastructure Advisor
    ai_provider: str = "ollama"

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:4b-instruct"
    ollama_timeout_seconds: int = 120
    ollama_cf_access_client_id: str | None = None
    ollama_cf_access_client_secret: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.8-flash"

    ai_advisor_max_instances: int = 1
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
