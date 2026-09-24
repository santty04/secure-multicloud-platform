import uuid
from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import decode_access_token
from app.db.models import ManagedResource, Role, User
from app.db.session import get_db
from app.services.audit import create_audit_log

bearer_scheme = HTTPBearer(auto_error=False)

DatabaseSession = Annotated[Session, Depends(get_db)]
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def authentication_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: BearerCredentials,
    db: DatabaseSession,
) -> User:
    if credentials is None:
        raise authentication_exception()

    try:
        subject = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(subject)
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise authentication_exception() from exc

    statement = (
        select(User)
        .options(
            joinedload(User.role).joinedload(Role.permissions),
            joinedload(User.azure_role).joinedload(Role.permissions),
            joinedload(User.aws_role).joinedload(Role.permissions),
        )
        .where(User.id == user_id)
    )

    user = db.execute(statement).unique().scalar_one_or_none()

    if user is None:
        raise authentication_exception()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


class PermissionChecker:
    def __init__(self, required_permission: str) -> None:
        self.required_permission = required_permission

    def __call__(
        self,
        current_user: CurrentUser,
    ) -> User:
        user_permissions = {
            permission.code for permission in current_user.role.permissions
        }

        if self.required_permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )

        return current_user


def require_permission(
    permission_code: str,
) -> Callable[..., User]:
    checker = PermissionChecker(permission_code)

    def audited_permission_dependency(
        request: Request,
        current_user: CurrentUser,
        db: DatabaseSession,
    ) -> User:
        try:
            return checker(current_user)
        except HTTPException:
            provider = request.path_params.get("provider")
            requested_resource_id = request.path_params.get(
                "resource_id",
            )

            resource_id: uuid.UUID | None = None

            if provider in {"azure", "aws"} and requested_resource_id:
                try:
                    parsed_resource_id = uuid.UUID(
                        str(requested_resource_id),
                    )
                except ValueError:
                    parsed_resource_id = None

                if parsed_resource_id is not None:
                    statement = select(ManagedResource.id).where(
                        ManagedResource.id == parsed_resource_id,
                        ManagedResource.provider == provider,
                    )
                    resource_id = db.scalar(statement)

            if provider in {"azure", "aws"}:
                correlation_id = uuid.UUID(
                    request.state.correlation_id,
                )

                create_audit_log(
                    db,
                    correlation_id=correlation_id,
                    operation_id=None,
                    user_id=current_user.id,
                    resource_id=resource_id,
                    provider=provider,
                    action=permission_code.rsplit(".", maxsplit=1)[-1],
                    decision="denied",
                    reason_code="permission_denied",
                    required_permission=permission_code,
                    role_code=current_user.role.code,
                    event_type="authorization",
                    http_method=request.method,
                    request_path=request.url.path,
                    details={
                        "requested_resource_id": (
                            str(requested_resource_id)
                            if requested_resource_id
                            else None
                        ),
                    },
                )

                db.commit()

            raise

    return audited_permission_dependency


# ============================================================
# PER-CLOUD AUTHORIZATION
# ============================================================

CLOUD_PROVIDERS = ("azure", "aws")


def cloud_role(user: User, provider: str) -> Role | None:
    """The role `user` holds in `provider`, or None when it has no access there."""
    if provider == "azure":
        return user.azure_role
    if provider == "aws":
        return user.aws_role
    return None


def cloud_role_code(user: User, provider: str) -> str:
    """Role code used to pick the provider identity; only called once authorized."""
    role = cloud_role(user, provider)
    if role is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions.")
    return role.code


def has_cloud_permission(user: User, provider: str, permission_code: str) -> bool:
    role = cloud_role(user, provider)
    return role is not None and any(
        permission.code == permission_code for permission in role.permissions
    )


def require_cloud_permission(
    permission_code: str,
    provider: str | None = None,
) -> Callable[..., User]:
    """Authorize a VM action against the caller's role in that cloud.

    `provider` is fixed for provider-specific routes (e.g. POST /instances/aws)
    and otherwise read from the `{provider}` path parameter. Denials are
    audited like `require_permission`, with the cloud role that was evaluated.
    """

    def audited_cloud_permission_dependency(
        request: Request,
        current_user: CurrentUser,
        db: DatabaseSession,
    ) -> User:
        target = provider or request.path_params.get("provider")
        if target not in CLOUD_PROVIDERS:
            # Unknown `{provider}` path value: the route's own path validation
            # rejects it with 422 before the handler can run.
            return current_user
        if has_cloud_permission(current_user, target, permission_code):
            return current_user

        role = cloud_role(current_user, target)
        requested_resource_id = request.path_params.get("resource_id")
        resource_id: uuid.UUID | None = None
        if requested_resource_id:
            try:
                resource_id = db.scalar(
                    select(ManagedResource.id).where(
                        ManagedResource.id == uuid.UUID(str(requested_resource_id)),
                        ManagedResource.provider == target,
                    )
                )
            except ValueError:
                resource_id = None

        create_audit_log(
            db,
            correlation_id=uuid.UUID(request.state.correlation_id),
            operation_id=None,
            user_id=current_user.id,
            resource_id=resource_id,
            provider=target,
            action=permission_code.rsplit(".", maxsplit=1)[-1],
            decision="denied",
            reason_code=(
                "cloud_access_denied" if role is None else "permission_denied"
            ),
            required_permission=permission_code,
            role_code=role.code if role else None,
            event_type="authorization",
            http_method=request.method,
            request_path=request.url.path,
            details={
                "requested_resource_id": (
                    str(requested_resource_id) if requested_resource_id else None
                ),
            },
        )
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        )

    return audited_cloud_permission_dependency


def clouds_with_permission(user: User, permission_code: str) -> list[str]:
    return [
        provider
        for provider in CLOUD_PROVIDERS
        if has_cloud_permission(user, provider, permission_code)
    ]


def require_any_cloud_permission(permission_code: str) -> Callable[..., User]:
    """For cross-cloud features (AI advisor): the permission in at least one cloud."""

    def any_cloud_permission_dependency(current_user: CurrentUser) -> User:
        if not clouds_with_permission(current_user, permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return current_user

    return any_cloud_permission_dependency


def ensure_cloud_permission(user: User, provider: str, permission_code: str) -> None:
    """Inline check for handlers that only learn the provider from stored data."""
    if not has_cloud_permission(user, provider, permission_code):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        )
