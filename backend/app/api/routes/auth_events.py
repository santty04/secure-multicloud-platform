from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.dependencies import DatabaseSession, require_permission
from app.db.models import AuthEvent, User
from app.schemas.auth_events import AuthEventPage

router = APIRouter(tags=["Authentication"])
# Sign-in events expose emails and IPs, so only user managers can read them.
Manager = Annotated[User, Depends(require_permission("user.manage"))]


@router.get("/auth-events", response_model=AuthEventPage)
def list_auth_events(
    actor: Manager,
    db: DatabaseSession,
    email: Annotated[str | None, Query(max_length=255)] = None,
    event_type: Annotated[str | None, Query(max_length=50)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AuthEventPage:
    del actor

    statement = select(AuthEvent)
    if email:
        statement = statement.where(AuthEvent.email == email.strip().lower())
    if event_type:
        statement = statement.where(AuthEvent.event_type == event_type)

    total = db.scalar(select(func.count()).select_from(statement.subquery()))
    items = db.scalars(
        statement.order_by(AuthEvent.created_at.desc(), AuthEvent.id)
        .limit(limit)
        .offset(offset)
    ).all()

    return AuthEventPage(items=list(items), total=total)
