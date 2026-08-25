from collections.abc import Callable
import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import decode_access_token
from app.db.models import ManagedResource, Role, User
from app.services.audit import create_audit_log
from app.db.session import get_db


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
        .options(joinedload(User.role).joinedload(Role.permissions))
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
