import json

import httpx
from pydantic import ValidationError

from app.ai.errors import (
    AIInvalidResponseError,
    AIServiceUnavailableError,
)
from app.ai.provider import StructuredModel
from app.core.config import settings


class OllamaProvider:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        self.base_url = (base_url or settings.ollama_base_url).rstrip("/")

        self.model = model or settings.ollama_model

        self.timeout_seconds = timeout_seconds or settings.ollama_timeout_seconds

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(
                timeout=5.0,
            ) as client:
                response = await client.get(
                    f"{self.base_url}/api/tags",
                )

                response.raise_for_status()

            return True

        except httpx.HTTPError:
            return False

    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[StructuredModel],
    ) -> StructuredModel:
        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
            "format": response_model.model_json_schema(),
            "options": {
                "temperature": 0,
            },
        }

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
            ) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )

                response.raise_for_status()

        except (
            httpx.ConnectError,
            httpx.ConnectTimeout,
            httpx.ReadTimeout,
            httpx.RemoteProtocolError,
        ) as exc:
            raise AIServiceUnavailableError(
                "The local AI service is unavailable."
            ) from exc

        except httpx.HTTPStatusError as exc:
            raise AIServiceUnavailableError(
                "The AI provider rejected the request."
            ) from exc

        try:
            response_payload = response.json()

            raw_content = response_payload["message"]["content"]

            parsed_content = json.loads(
                raw_content,
            )

            return response_model.model_validate(
                parsed_content,
            )

        except (
            KeyError,
            TypeError,
            ValueError,
            json.JSONDecodeError,
            ValidationError,
        ) as exc:
            raise AIInvalidResponseError(
                "The AI provider returned an invalid structured response."
            ) from exc
