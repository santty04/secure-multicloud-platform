import uuid

import pytest
from fastapi import HTTPException

from app.api.dependencies import PermissionChecker
from app.db.models import Permission, Role, User


def create_user_with_permissions(
    role_code: str,
    permission_codes: set[str],
) -> User:
    permissions = [
        Permission(
            code=permission_code,
            description=f"Permission {permission_code}",
        )
        for permission_code in permission_codes
    ]

    role = Role(
        code=role_code,
        name=role_code.title(),
        description=f"Role {role_code}",
        permissions=permissions,
    )

    return User(
        id=uuid.uuid4(),
        email=f"{role_code}@example.com",
        full_name=f"{role_code.title()} User",
        password_hash="not-used-in-rbac-unit-tests",
        is_active=True,
        role=role,
    )


@pytest.fixture
def administrator() -> User:
    return create_user_with_permissions(
        role_code="administrator",
        permission_codes={
            "vm.read",
            "vm.create",
            "vm.start",
            "vm.stop",
            "vm.update",
            "vm.delete",
            "operation.read",
            "user.manage",
        },
    )


@pytest.fixture
def operator() -> User:
    return create_user_with_permissions(
        role_code="operator",
        permission_codes={
            "vm.read",
            "vm.start",
            "vm.stop",
            "operation.read",
        },
    )


@pytest.fixture
def viewer() -> User:
    return create_user_with_permissions(
        role_code="viewer",
        permission_codes={
            "vm.read",
            "operation.read",
        },
    )


def test_administrator_can_delete_virtual_machine(
    administrator: User,
):
    checker = PermissionChecker("vm.delete")

    authorized_user = checker(administrator)

    assert authorized_user is administrator


def test_operator_can_start_virtual_machine(
    operator: User,
):
    checker = PermissionChecker("vm.start")

    authorized_user = checker(operator)

    assert authorized_user is operator


def test_operator_cannot_delete_virtual_machine(
    operator: User,
):
    checker = PermissionChecker("vm.delete")

    with pytest.raises(HTTPException) as exception:
        checker(operator)

    assert exception.value.status_code == 403
    assert exception.value.detail == "Insufficient permissions."


def test_viewer_can_read_virtual_machines(
    viewer: User,
):
    checker = PermissionChecker("vm.read")

    authorized_user = checker(viewer)

    assert authorized_user is viewer


def test_viewer_cannot_start_virtual_machine(
    viewer: User,
):
    checker = PermissionChecker("vm.start")

    with pytest.raises(HTTPException) as exception:
        checker(viewer)

    assert exception.value.status_code == 403
    assert exception.value.detail == "Insufficient permissions."


def test_unknown_permission_is_denied(
    administrator: User,
):
    checker = PermissionChecker("unknown.permission")

    with pytest.raises(HTTPException) as exception:
        checker(administrator)

    assert exception.value.status_code == 403
    assert exception.value.detail == "Insufficient permissions."
