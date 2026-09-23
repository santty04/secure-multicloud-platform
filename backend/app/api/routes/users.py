import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, selectinload

from app.api.dependencies import DatabaseSession, PermissionChecker, require_permission
from app.core.security import hash_password
from app.db.models import Role, User
from app.schemas.users import (
    RoleResponse,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from app.services.email import EmailDeliveryError
from app.services.password_setup import (
    issue_password_setup_token,
    send_password_setup_email,
)

router = APIRouter(tags=["Users and roles"])
Manager = Annotated[User, Depends(require_permission("user.manage"))]


def serialize_user(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        role_id=user.role_id,
        role_code=user.role.code,
        role_name=user.role.name,
        created_at=user.created_at,
    )


def lock_management(db: DatabaseSession, actor: User) -> None:
    # Serialize management writes, then recheck authorization after waiting.
    # Concurrent administrators cannot revoke each other using stale access.
    list(db.scalars(select(Role).order_by(Role.id).with_for_update()))
    db.refresh(actor)
    if not actor.is_active:
        raise HTTPException(403, "User account is inactive.")
    PermissionChecker("user.manage")(actor)


def find_user(db: DatabaseSession, user_id: uuid.UUID) -> User:
    user = db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(404, "User not found.")
    return user


def find_role(db: DatabaseSession, role_id: uuid.UUID) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(422, "Selected role does not exist.")
    return role


def save_user(db: DatabaseSession, user: User) -> UserResponse:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Ya existe un usuario con ese correo.") from exc
    db.refresh(user)
    return serialize_user(user)


@router.get("/roles", response_model=list[RoleResponse])
def list_roles(actor: Manager, db: DatabaseSession) -> list[RoleResponse]:
    roles = db.scalars(
        select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
    )
    return [
        RoleResponse(
            id=role.id,
            code=role.code,
            name=role.name,
            description=role.description,
            permissions=sorted(permission.code for permission in role.permissions),
        )
        for role in roles
    ]


@router.get("/users", response_model=UserListResponse)
def list_users(
    actor: Manager,
    db: DatabaseSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    q: Annotated[str, Query(max_length=150)] = "",
) -> UserListResponse:
    filters = []
    if q.strip():
        filters.append(
            or_(
                User.email.icontains(q.strip(), autoescape=True),
                User.full_name.icontains(q.strip(), autoescape=True),
            )
        )
    total = db.scalar(select(func.count()).select_from(User).where(*filters))
    users = db.scalars(
        select(User)
        .options(joinedload(User.role))
        .where(*filters)
        .order_by(User.created_at.desc(), User.id)
        .offset(offset)
        .limit(limit)
    )
    return UserListResponse(
        items=[serialize_user(user) for user in users], total=total or 0
    )


@router.get("/users/{user_id}", response_model=UserResponse)
def read_user(user_id: uuid.UUID, actor: Manager, db: DatabaseSession) -> UserResponse:
    return serialize_user(find_user(db, user_id))


def _issue_and_send_invitation(db: DatabaseSession, user: User) -> None:
    token = issue_password_setup_token(db, user)
    db.commit()
    try:
        send_password_setup_email(user, token)
    except EmailDeliveryError as exc:
        raise HTTPException(
            502,
            "El usuario se guardó, pero no se pudo enviar el correo de "
            "invitación. Reenvíala desde la lista de usuarios.",
        ) from exc


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreate, actor: Manager, db: DatabaseSession
) -> UserResponse:
    lock_management(db, actor)
    role = find_role(db, payload.role_id)
    if db.scalar(select(User.id).where(func.lower(User.email) == payload.email)):
        raise HTTPException(409, "Ya existe un usuario con ese correo.")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role=role,
        is_active=payload.is_active,
        # No admin-chosen password: the user sets their own via the
        # one-time activation link, so this hash must never validate.
        password_hash=hash_password(secrets.token_urlsafe(32)),
    )
    db.add(user)
    response = save_user(db, user)
    _issue_and_send_invitation(db, user)
    return response


@router.post("/users/{user_id}/resend-invitation", status_code=204)
def resend_invitation(
    user_id: uuid.UUID, actor: Manager, db: DatabaseSession
) -> Response:
    lock_management(db, actor)
    user = find_user(db, user_id)
    _issue_and_send_invitation(db, user)
    return Response(status_code=204)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    actor: Manager,
    db: DatabaseSession,
) -> UserResponse:
    lock_management(db, actor)
    user = find_user(db, user_id)
    role = find_role(db, payload.role_id)
    if user.id == actor.id and (
        not payload.is_active or "user.manage" not in {p.code for p in role.permissions}
    ):
        raise HTTPException(
            409, "No puedes desactivar tu cuenta ni quitarte el acceso de gestión."
        )
    if db.scalar(
        select(User.id).where(
            func.lower(User.email) == payload.email, User.id != user.id
        )
    ):
        raise HTTPException(409, "Ya existe un usuario con ese correo.")
    user.email = payload.email
    user.full_name = payload.full_name
    user.role = role
    user.is_active = payload.is_active
    return save_user(db, user)


@router.delete("/users/{user_id}", status_code=204)
def deactivate_user(
    user_id: uuid.UUID, actor: Manager, db: DatabaseSession
) -> Response:
    lock_management(db, actor)
    user = find_user(db, user_id)
    if user.id == actor.id:
        raise HTTPException(409, "No puedes desactivar tu propia cuenta.")
    user.is_active = False
    db.commit()
    return Response(status_code=204)
