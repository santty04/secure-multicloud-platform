import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.security import decode_access_token
from app.db.models import Role, User
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
) -> PermissionChecker:
    return PermissionChecker(permission_code)
