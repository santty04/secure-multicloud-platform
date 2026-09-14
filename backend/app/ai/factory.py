from app.ai.errors import AIConfigurationError
from app.ai.ollama import OllamaProvider
from app.ai.provider import AIProvider
from app.core.config import settings


def get_ai_provider() -> AIProvider:
    provider_name = settings.ai_provider.strip().lower()

    if provider_name == "ollama":
        return OllamaProvider()

    raise AIConfigurationError("The configured AI provider is not supported.")
