import psycopg
from alembic.config import Config
from azure.identity import ManagedIdentityCredential
from psycopg import sql

from alembic import command
from app.core.config import settings

POSTGRES_ENTRA_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"


def _validate_settings() -> None:
    required = {
        "DATABASE_HOST": settings.database_host,
        "DATABASE_NAME": settings.database_name,
        "DATABASE_USER": settings.database_user,
        "DATABASE_APPLICATION_USER": settings.database_application_user,
        "DATABASE_APPLICATION_PRINCIPAL_ID": (
            settings.database_application_principal_id
        ),
        "AZURE_MANAGED_IDENTITY_CLIENT_ID": (settings.azure_managed_identity_client_id),
    }

    missing = [name for name, value in required.items() if not value]

    if missing:
        raise RuntimeError(f"Missing required settings: {', '.join(missing)}")


def _get_access_token() -> str:
    credential = ManagedIdentityCredential(
        client_id=settings.azure_managed_identity_client_id,
    )

    return credential.get_token(POSTGRES_ENTRA_SCOPE).token


def _connect(database_name: str) -> psycopg.Connection:
    return psycopg.connect(
        host=settings.database_host,
        port=settings.database_port,
        dbname=database_name,
        user=settings.database_user,
        password=_get_access_token(),
        sslmode="require",
        connect_timeout=15,
    )


def _ensure_application_principal() -> None:
    application_user = settings.database_application_user

    with _connect("postgres") as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM pg_roles WHERE rolname = %s",
                (application_user,),
            )

            exists = cursor.fetchone() is not None

            if not exists:
                cursor.execute(
                    """
                    SELECT *
                    FROM pg_catalog.pgaadauth_create_principal_with_oid(
                        %s,
                        %s,
                        'service',
                        false,
                        false
                    )
                    """,
                    (
                        application_user,
                        settings.database_application_principal_id,
                    ),
                )

                result = cursor.fetchone()
                print(f"Created application principal: {result}")
            else:
                print(f"Application principal already exists: {application_user}")

            cursor.execute(
                sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                    sql.Identifier(settings.database_name),
                    sql.Identifier(application_user),
                )
            )

        connection.commit()


def _run_migrations() -> None:
    print("Running Alembic migrations...")

    alembic_config = Config("alembic.ini")
    command.upgrade(alembic_config, "head")

    print("Alembic migrations completed.")


def _grant_runtime_permissions() -> None:
    application_user = settings.database_application_user
    role = sql.Identifier(application_user)

    with _connect(settings.database_name) as connection:
        with connection.cursor() as cursor:
            cursor.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(role))

            cursor.execute(
                sql.SQL(
                    """
                    GRANT SELECT, INSERT, UPDATE, DELETE
                    ON ALL TABLES IN SCHEMA public
                    TO {}
                    """
                ).format(role)
            )

            cursor.execute(
                sql.SQL(
                    """
                    GRANT USAGE, SELECT, UPDATE
                    ON ALL SEQUENCES IN SCHEMA public
                    TO {}
                    """
                ).format(role)
            )

            cursor.execute(
                sql.SQL(
                    """
                    ALTER DEFAULT PRIVILEGES
                    IN SCHEMA public
                    GRANT SELECT, INSERT, UPDATE, DELETE
                    ON TABLES
                    TO {}
                    """
                ).format(role)
            )

            cursor.execute(
                sql.SQL(
                    """
                    ALTER DEFAULT PRIVILEGES
                    IN SCHEMA public
                    GRANT USAGE, SELECT, UPDATE
                    ON SEQUENCES
                    TO {}
                    """
                ).format(role)
            )

        connection.commit()

    print(f"Runtime permissions granted to {application_user}.")


def main() -> None:
    _validate_settings()

    print("Starting Azure PostgreSQL bootstrap...")

    _ensure_application_principal()
    _run_migrations()
    _grant_runtime_permissions()

    print("Azure PostgreSQL bootstrap completed successfully.")


if __name__ == "__main__":
    main()
