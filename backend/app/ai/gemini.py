import asyncio
import logging

from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.ai.errors import (
    AIConfigurationError,
    AIInvalidResponseError,
    AIServiceUnavailableError,
)
from app.ai.provider import StructuredModel
from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MAX_ATTEMPTS = 3
GEMINI_RETRYABLE_CODES = {429, 503}


def _is_retryable_api_error(exc: errors.APIError) -> bool:
    code = getattr(exc, "code", None)

    if code in GEMINI_RETRYABLE_CODES:
        return True

    status = str(getattr(exc, "status", "")).upper()

    return status in {
        "RESOURCE_EXHAUSTED",
        "UNAVAILABLE",
    }


class GeminiProvider:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or settings.gemini_api_key
        self.model = model or settings.gemini_model

        if not self.api_key:
            raise AIConfigurationError("Gemini API key is not configured.")

        self.client = genai.Client(
            api_key=self.api_key,
        )

    async def health_check(self) -> bool:
        try:
            await asyncio.to_thread(
                self.client.models.get,
                model=self.model,
            )
            return True
        except errors.APIError:
            return False

    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[StructuredModel],
    ) -> StructuredModel:
        response = None

        for attempt in range(1, GEMINI_MAX_ATTEMPTS + 1):
            try:
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        response_mime_type="application/json",
                        response_schema=response_model,
                        thinking_config=types.ThinkingConfig(
                            thinking_level="low",
                        ),
                    ),
                )

                break

            except errors.APIError as exc:
                retryable = _is_retryable_api_error(exc)
                final_attempt = attempt >= GEMINI_MAX_ATTEMPTS

                if retryable and not final_attempt:
                    delay_seconds = 2 ** (attempt - 1)

                    logger.warning(
                        (
                            "Transient Gemini API error. "
                            "attempt=%s/%s code=%s status=%s "
                            "retry_in_seconds=%s"
                        ),
                        attempt,
                        GEMINI_MAX_ATTEMPTS,
                        getattr(exc, "code", None),
                        getattr(exc, "status", None),
                        delay_seconds,
                    )

                    await asyncio.sleep(delay_seconds)
                    continue

                logger.error(
                    (
                        "Gemini API error: type=%s code=%s "
                        "status=%s message=%s attempts=%s"
                    ),
                    type(exc).__name__,
                    getattr(exc, "code", None),
                    getattr(exc, "status", None),
                    getattr(exc, "message", None),
                    attempt,
                )

                raise AIServiceUnavailableError(
                    "Gemini service is unavailable."
                ) from exc

            except Exception as exc:
                logger.error(
                    "Unexpected Gemini error: type=%s",
                    type(exc).__name__,
                )

                raise AIServiceUnavailableError(
                    "Gemini service is unavailable."
                ) from exc

        if response is None:
            raise AIServiceUnavailableError("Gemini service is unavailable.")

        try:
            if response.parsed is not None:
                if isinstance(response.parsed, response_model):
                    return response.parsed

                return response_model.model_validate(response.parsed)

            if not response.text:
                raise ValueError("Gemini returned an empty response.")

            return response_model.model_validate_json(response.text)

        except (
            TypeError,
            ValueError,
            ValidationError,
        ) as exc:
            raise AIInvalidResponseError(
                "Gemini returned an invalid structured response."
            ) from exc
