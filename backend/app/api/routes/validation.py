from fastapi import APIRouter

from app.schemas.instance import (
    InstanceValidationRequest,
    InstanceValidationResponse,
)

router = APIRouter(
    prefix="/validation",
    tags=["Validation"],
)


@router.post(
    "/instance",
    response_model=InstanceValidationResponse,
    status_code=200,
)
async def validate_instance_request(
    request: InstanceValidationRequest,
) -> InstanceValidationResponse:
    return InstanceValidationResponse(
        valid=True,
        provider=request.provider,
        name=request.name,
        region=request.region,
        size=request.size,
    )
