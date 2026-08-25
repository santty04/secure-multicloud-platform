from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import Role, User
from app.db.session import SessionLocal

MINIMUM_PASSWORD_LENGTH = 12


def request_email() -> str:
    value = input("Administrator email: ").strip().lower()

    try:
        validated_email = TypeAdapter(EmailStr).validate_python(value)
    except ValidationError as exc:
        raise ValueError("The email address is invalid.") from exc

    return str(validated_email)


def request_full_name() -> str:
    full_name = input("Administrator full name: ").strip()

    if len(full_name) < 2:
        raise ValueError("The full name must contain at least 2 characters.")

    return full_name


def request_password() -> str:
    password = getpass("Administrator password: ")
    confirmation = getpass("Confirm password: ")

    if password != confirmation:
        raise ValueError("The passwords do not match.")

    if len(password) < MINIMUM_PASSWORD_LENGTH:
        raise ValueError(
            f"The password must contain at least {MINIMUM_PASSWORD_LENGTH} characters."
        )

    return password


def create_admin() -> None:
    email = request_email()
    full_name = request_full_name()
    password = request_password()

    with SessionLocal() as db:
        existing_user = db.scalar(select(User).where(User.email == email))

        if existing_user is not None:
            raise ValueError(f"A user with the email {email} already exists.")

        administrator_role = db.scalar(select(Role).where(Role.code == "administrator"))

        if administrator_role is None:
            raise RuntimeError(
                "Administrator role not found. Run the RBAC seed script first."
            )

        admin = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            is_active=True,
            role_id=administrator_role.id,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("Administrator created successfully.")
        print(f"ID: {admin.id}")
        print(f"Email: {admin.email}")
        print(f"Role: {administrator_role.name}")


if __name__ == "__main__":
    try:
        create_admin()
    except (ValueError, RuntimeError) as exc:
        print(f"Error: {exc}")
        raise SystemExit(1) from exc
