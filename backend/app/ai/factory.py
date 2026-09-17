from app.ai.errors import AIConfigurationError
from app.ai.gemini import GeminiProvider
from app.ai.ollama import OllamaProvider
from app.ai.provider import AIProvider
from app.core.config import settings


def get_ai_provider(
    provider_name: str | None = None,
) -> AIProvider:
    selected_provider = (
        provider_name or settings.ai_provider
    ).strip().lower()

    if selected_provider == "ollama":
        return OllamaProvider()

    if selected_provider == "gemini":
        return GeminiProvider()

    raise AIConfigurationError(
        "The configured AI provider is not supported."
    )