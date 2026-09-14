from typing import Protocol, TypeVar

from pydantic import BaseModel

StructuredModel = TypeVar(
    "StructuredModel",
    bound=BaseModel,
)


class AIProvider(Protocol):
    async def generate_structured(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        response_model: type[StructuredModel],
    ) -> StructuredModel:
        """Generate and validate a structured AI response."""

    async def health_check(self) -> bool:
        """Return whether the AI provider is reachable."""
