import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def get_correlation_id(request: Request) -> str:
    return getattr(request.state, "correlation_id", "unavailable")


async def http_exception_handler(
    request: Request,
    exception: StarletteHTTPException,
) -> JSONResponse:
    correlation_id = get_correlation_id(request)

    error_code = "resource_not_found" if exception.status_code == 404 else "http_error"

    return JSONResponse(
        status_code=exception.status_code,
        content={
            "error": {
                "code": error_code,
                "message": str(exception.detail),
                "correlation_id": correlation_id,
            }
        },
        # Keep headers the route set (e.g. WWW-Authenticate, Retry-After).
        headers={**(exception.headers or {}), "X-Correlation-ID": correlation_id},
    )


async def validation_exception_handler(
    request: Request,
    exception: RequestValidationError,
) -> JSONResponse:
    correlation_id = get_correlation_id(request)

    validation_errors: list[dict[str, Any]] = [
        {
            "location": list(error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        }
        for error in exception.errors()
    ]

    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "The request contains invalid data.",
                "correlation_id": correlation_id,
                "details": validation_errors,
            }
        },
        headers={"X-Correlation-ID": correlation_id},
    )


async def unexpected_exception_handler(
    request: Request,
    exception: Exception,
) -> JSONResponse:
    correlation_id = get_correlation_id(request)

    logger.exception(
        "Unexpected application error",
        extra={"correlation_id": correlation_id},
        exc_info=exception,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_server_error",
                "message": "An unexpected error occurred.",
                "correlation_id": correlation_id,
            }
        },
        headers={"X-Correlation-ID": correlation_id},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(
        StarletteHTTPException,
        http_exception_handler,
    )
    app.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,
    )
    app.add_exception_handler(
        Exception,
        unexpected_exception_handler,
    )
