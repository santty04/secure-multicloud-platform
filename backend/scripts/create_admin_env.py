import os

from sqlalchemy import select

from app.db.models import Role, User
from app.db.session import SessionLocal


def required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def main() -> None:
    email = required("INITIAL_ADMIN_EMAIL").strip().lower()
    full_name = required("INITIAL_ADMIN_FULL_NAME").strip()
    password_hash = required("INITIAL_ADMIN_PASSWORD_HASH")

    with SessionLocal() as db:
        role = db.scalar(select(Role).where(Role.code == "administrator"))

        if role is None:
            raise RuntimeError(
                "Role 'administrator' does not exist. RBAC must be seeded first."
            )

        user = db.scalar(select(User).where(User.email == email))

        if user is None:
            user = User(
                email=email,
                full_name=full_name,
                password_hash=password_hash,
                is_active=True,
                role_id=role.id,
                azure_role_id=role.id,
                aws_role_id=role.id,
            )
            db.add(user)
            print(f"Administrator created: {email}")
        else:
            user.full_name = full_name
            user.password_hash = password_hash
            user.is_active = True
            user.role_id = role.id
            user.azure_role_id = role.id
            user.aws_role_id = role.id
            print(f"Administrator updated: {email}")

        db.commit()

    print("Administrator bootstrap completed successfully.")


if __name__ == "__main__":
    main()
