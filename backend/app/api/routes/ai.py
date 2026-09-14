from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.ai.errors import (
    AIConfigurationError,
    AIInvalidResponseError,
    AIPolicyViolationError,
    AIServiceUnavailableError,
)
from app.ai.factory import get_ai_provider
from app.ai.service import generate_infrastructure_recommendation
from app.api.dependencies import require_permission
from app.core.config import settings
from app.db.models import User
from app.schemas.ai import (
    AIHealthResponse,
    InfrastructureAdvisorRequest,
    InfrastructureAdvisorResponse,
)

router = APIRouter(
    prefix="/ai",
    tags=["AI Infrastructure Advisor"],
)


CanUseInfrastructureAdvisor = Annotated[
    User,
    Depends(require_permission("vm.create")),
]


@router.get(
    "/health",
    response_model=AIHealthResponse,
    status_code=status.HTTP_200_OK,
)
async def get_ai_health(
    current_user: CanUseInfrastructureAdvisor,
) -> AIHealthResponse:
    del current_user

    try:
        provider = get_ai_provider()

        available = await provider.health_check()

    except AIConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI provider configuration is unavailable.",
        ) from exc

    return AIHealthResponse(
        provider=settings.ai_provider,
        model=settings.ollama_model,
        available=available,
    )


@router.post(
    "/infrastructure-advisor",
    response_model=InfrastructureAdvisorResponse,
    status_code=status.HTTP_200_OK,
)
async def infrastructure_advisor(
    payload: InfrastructureAdvisorRequest,
    current_user: CanUseInfrastructureAdvisor,
) -> InfrastructureAdvisorResponse:
    del current_user

    try:
        return await generate_infrastructure_recommendation(
            payload,
        )

    except AIConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI provider configuration is unavailable.",
        ) from exc

    except AIServiceUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI infrastructure advisor is temporarily unavailable.",
        ) from exc

    except AIInvalidResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI infrastructure advisor returned an invalid response.",
        ) from exc

    except AIPolicyViolationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI recommendation violated platform policy.",
        ) from exc
