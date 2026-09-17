class AIServiceError(RuntimeError):
    """Base exception for AI service failures."""


class AIConfigurationError(AIServiceError):
    """Raised when the configured AI provider is invalid or incomplete."""


class AIServiceUnavailableError(AIServiceError):
    """Raised when the configured AI provider cannot be reached."""


class AIInvalidResponseError(AIServiceError):
    """Raised when the AI provider returns an invalid structured response."""


class AIPolicyViolationError(AIServiceError):
    """Raised when an AI recommendation violates platform policy."""
