import uuid

import pytest
from sqlalchemy import select

from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import Permission, Role, User
from app.services.email import EmailDeliveryError


@pytest.fixture
def accounts(db_session):
    permission = Permission(code="user.manage", description="Manage users")
    admin_role = Role(
        code="administrator", name="Administrator", permissions=[permission]
    )
    viewer_role = Role(code="viewer", name="Viewer")
    admin = User(
        email="manager@example.com",
        full_name="Manager",
        role=admin_role,
        password_hash=hash_password("TestPassword123!"),
        is_active=True,
    )
    viewer = User(
        email="reader@example.com",
        full_name="Reader",
        role=viewer_role,
        password_hash=hash_password("TestPassword123!"),
        is_active=True,
    )
    db_session.add_all([admin, viewer])
    db_session.flush()
    return admin, viewer


def headers(user):
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


def payload(default_role_id, **changes):
    return {
        "email": "New@example.com",
        "full_name": " New User ",
        "role_id": str(default_role_id),
        "azure_role_id": str(default_role_id),
        "aws_role_id": None,
        **changes,
    }


def update_payload(user, **changes):
    return {
        "email": user.email,
        "full_name": user.full_name,
        "role_id": str(user.role_id),
        "azure_role_id": str(user.azure_role_id) if user.azure_role_id else None,
        "aws_role_id": str(user.aws_role_id) if user.aws_role_id else None,
        "is_active": user.is_active,
        **changes,
    }


@pytest.mark.parametrize(
    "method,path",
    [
        ("get", "/users"),
        ("get", "/roles"),
        ("get", "/users/{id}"),
        ("post", "/users"),
        ("put", "/users/{id}"),
        ("delete", "/users/{id}"),
    ],
)
def test_management_requires_permission(client, accounts, method, path):
    admin, viewer = accounts
    path = "/api/v1" + path.format(id=viewer.id)
    call = getattr(client, method)
    kwargs = {"json": payload(admin.role_id)} if method in {"post", "put"} else {}
    assert call(path, **kwargs).status_code == 401
    assert call(path, headers=headers(viewer), **kwargs).status_code == 403


def test_create_list_read_and_login(client, accounts, db_session, captured_emails):
    admin, viewer = accounts
    response = client.post(
        "/api/v1/users", headers=headers(admin), json=payload(viewer.role_id)
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com" and data["full_name"] == "New User"
    assert "password" not in data and "password_hash" not in data
    user = db_session.scalar(select(User).where(User.email == "new@example.com"))

    # No admin-chosen password: the account isn't usable until the invite is redeemed.
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "NewPassword123!"},
        ).status_code
        == 401
    )
    assert len(captured_emails) == 1
    assert captured_emails[0]["email"] == "new@example.com"
    token = captured_emails[0]["token"]

    info = client.get(f"/api/v1/auth/set-password/{token}")
    assert info.status_code == 200
    assert info.json() == {"email": "new@example.com", "full_name": "New User"}

    activation = client.post(
        "/api/v1/auth/set-password",
        json={"token": token, "password": "NewPassword123!"},
    )
    assert activation.status_code == 200
    assert "access_token" in activation.json()
    db_session.refresh(user)
    assert verify_password("NewPassword123!", user.password_hash)

    # The token is single-use.
    assert client.get(f"/api/v1/auth/set-password/{token}").status_code == 400
    assert (
        client.post(
            "/api/v1/auth/set-password",
            json={"token": token, "password": "AnotherPassword123!"},
        ).status_code
        == 400
    )

    assert client.get(f"/api/v1/users/{user.id}", headers=headers(admin)).json() == data
    listing = client.get("/api/v1/users?q=new&limit=1", headers=headers(admin)).json()
    assert listing["total"] == 1 and len(listing["items"]) == 1
    assert (
        client.get("/api/v1/users?offset=100", headers=headers(admin)).json()["items"]
        == []
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "NewPassword123!"},
        ).status_code
        == 200
    )
    roles = client.get("/api/v1/roles", headers=headers(admin)).json()
    assert any("user.manage" in role["permissions"] for role in roles)


def test_resend_invitation_invalidates_previous_token(
    client, accounts, db_session, captured_emails
):
    admin, viewer = accounts
    client.post("/api/v1/users", headers=headers(admin), json=payload(viewer.role_id))
    user = db_session.scalar(select(User).where(User.email == "new@example.com"))
    first_token = captured_emails[0]["token"]

    assert (
        client.post(
            f"/api/v1/users/{user.id}/resend-invitation", headers=headers(admin)
        ).status_code
        == 204
    )
    assert len(captured_emails) == 2
    second_token = captured_emails[1]["token"]
    assert second_token != first_token

    assert client.get(f"/api/v1/auth/set-password/{first_token}").status_code == 400
    assert client.get(f"/api/v1/auth/set-password/{second_token}").status_code == 200


def test_email_delivery_failure_surfaces_502(client, accounts, monkeypatch):
    admin, viewer = accounts

    def _boom(user, token):
        raise EmailDeliveryError("provider down")

    monkeypatch.setattr("app.api.routes.users.send_password_setup_email", _boom)
    response = client.post(
        "/api/v1/users", headers=headers(admin), json=payload(viewer.role_id)
    )
    assert response.status_code == 502


def test_create_user_does_not_accept_password(client, accounts):
    admin, viewer = accounts
    # The frontend no longer sends a password: creation must succeed without it.
    assert (
        client.post(
            "/api/v1/users", headers=headers(admin), json=payload(viewer.role_id)
        ).status_code
        == 201
    )
    # Passwords are set by the invited user only, never by the admin.
    response = client.post(
        "/api/v1/users",
        headers=headers(admin),
        json=payload(
            viewer.role_id, email="other@example.com", password="NewPassword123!"
        ),
    )
    assert response.status_code == 422
    assert "NewPassword123!" not in response.text


def test_duplicate_email_and_invalid_inputs(client, accounts):
    admin, viewer = accounts
    for changes, status in [
        ({"email": "READER@example.com"}, 409),
        ({"full_name": "   "}, 422),
        ({"email": "invalid"}, 422),
        ({"role_id": str(uuid.uuid4())}, 422),
        ({"permissions": ["user.manage"]}, 422),
    ]:
        result = client.post(
            "/api/v1/users",
            headers=headers(admin),
            json=payload(viewer.role_id, **changes),
        )
        assert result.status_code == status
    assert (
        client.get("/api/v1/users?limit=101", headers=headers(admin)).status_code == 422
    )
    assert (
        client.get(f"/api/v1/users/{uuid.uuid4()}", headers=headers(admin)).status_code
        == 404
    )


def test_role_change_applies_to_existing_token(client, accounts):
    admin, viewer = accounts
    original_role_id = viewer.role_id
    token = headers(viewer)
    result = client.put(
        f"/api/v1/users/{viewer.id}",
        headers=headers(admin),
        json=update_payload(viewer, role_id=str(admin.role_id)),
    )
    assert result.status_code == 200
    assert client.get("/api/v1/users", headers=token).status_code == 200
    assert (
        "user.manage"
        in client.get("/api/v1/auth/me", headers=token).json()["permissions"]
    )
    result = client.put(
        f"/api/v1/users/{viewer.id}",
        headers=headers(admin),
        json=update_payload(viewer, role_id=str(original_role_id)),
    )
    assert result.status_code == 200
    assert client.get("/api/v1/users", headers=token).status_code == 403


def test_deactivation_blocks_existing_token_and_login_and_can_reactivate(
    client, accounts, db_session
):
    admin, viewer = accounts
    token = headers(viewer)
    assert (
        client.delete(f"/api/v1/users/{viewer.id}", headers=headers(admin)).status_code
        == 204
    )
    assert db_session.get(User, viewer.id) is not None
    assert client.get("/api/v1/auth/me", headers=token).status_code == 403
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": viewer.email, "password": "TestPassword123!"},
        ).status_code
        == 401
    )
    result = client.put(
        f"/api/v1/users/{viewer.id}",
        headers=headers(admin),
        json=update_payload(viewer, is_active=True),
    )
    assert result.status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": viewer.email, "password": "TestPassword123!"},
        ).status_code
        == 200
    )


def test_manager_cannot_lock_self_out(client, accounts):
    admin, viewer = accounts
    assert (
        client.delete(f"/api/v1/users/{admin.id}", headers=headers(admin)).status_code
        == 409
    )
    for changes in [{"is_active": False}, {"role_id": str(viewer.role_id)}]:
        assert (
            client.put(
                f"/api/v1/users/{admin.id}",
                headers=headers(admin),
                json=update_payload(admin, **changes),
            ).status_code
            == 409
        )
    result = client.put(
        f"/api/v1/users/{admin.id}",
        headers=headers(admin),
        json=update_payload(admin, full_name="Updated Name"),
    )
    assert result.status_code == 200 and result.json()["full_name"] == "Updated Name"


def test_update_duplicate_and_unknown_user(client, accounts):
    admin, viewer = accounts
    result = client.put(
        f"/api/v1/users/{viewer.id}",
        headers=headers(admin),
        json=update_payload(viewer, email=admin.email.upper()),
    )
    assert result.status_code == 409
    assert (
        client.delete(
            f"/api/v1/users/{uuid.uuid4()}", headers=headers(admin)
        ).status_code
        == 404
    )
