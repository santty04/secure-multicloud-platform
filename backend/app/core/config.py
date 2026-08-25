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

    # AWS
    aws_region: str = "us-east-2"

    aws_viewer_role_arn: str | None = None
    aws_operator_role_arn: str | None = None
    aws_administrator_role_arn: str | None = None

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
