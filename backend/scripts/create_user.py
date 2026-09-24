from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from app.core.security import hash_password
from app.db.models import Role, User
from app.db.session import SessionLocal

MINIMUM_PASSWORD_LENGTH = 12
ALLOWED_ROLES = {
    "administrator",
    "operator",
    "viewer",
}


def request_email() -> str:
    value = input("User email: ").strip().lower()

    try:
        validated_email = TypeAdapter(EmailStr).validate_python(value)
    except ValidationError as exc:
        raise ValueError("The email address is invalid.") from exc

    return str(validated_email)


def request_full_name() -> str:
    full_name = input("User full name: ").strip()

    if len(full_name) < 2:
        raise ValueError("The full name must contain at least 2 characters.")

    return full_name


def request_role_code() -> str:
    available_roles = ", ".join(sorted(ALLOWED_ROLES))
    role_code = input(f"Role ({available_roles}): ").strip().lower()

    if role_code not in ALLOWED_ROLES:
        raise ValueError(f"Role must be one of: {available_roles}.")

    return role_code


def request_password() -> str:
    password = getpass("User password: ")
    confirmation = getpass("Confirm password: ")

    if password != confirmation:
        raise ValueError("The passwords do not match.")

    if len(password) < MINIMUM_PASSWORD_LENGTH:
        raise ValueError(
            f"The password must contain at least {MINIMUM_PASSWORD_LENGTH} characters."
        )

    return password


def create_user() -> None:
    email = request_email()
    full_name = request_full_name()
    role_code = request_role_code()
    password = request_password()

    with SessionLocal() as db:
        existing_user = db.scalar(select(User).where(User.email == email))

        if existing_user is not None:
            raise ValueError(f"A user with the email {email} already exists.")

        role = db.scalar(select(Role).where(Role.code == role_code))

        if role is None:
            raise RuntimeError(
                f"Role '{role_code}' not found. Run the RBAC seed script first."
            )

        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            is_active=True,
            role_id=role.id,
            azure_role_id=role.id,
            aws_role_id=role.id,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print("User created successfully.")
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Role: {role.code}")


if __name__ == "__main__":
    try:
        create_user()
    except (ValueError, RuntimeError) as exc:
        print(f"Error: {exc}")
        raise SystemExit(1) from exc
