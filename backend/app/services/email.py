import logging

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    """Raised when a transactional email fails to send."""


def send_email(*, to: str, subject: str, html: str, text: str) -> None:
    """Send a transactional email through Resend."""
    if not settings.resend_api_key:
        if settings.app_env == "development":
            # No Resend account needed for local dev: print the email so the
            # activation link is still reachable while iterating. `print`
            # (not `logger.info`) because uvicorn's default log level hides
            # INFO records.
            print(
                f"\n--- DEV EMAIL ---\nTo: {to}\nSubject: {subject}\n{text}\n-----------------\n"
            )
            return
        logger.warning("RESEND_API_KEY is not configured; skipping email to %s.", to)
        raise EmailDeliveryError("Email delivery is not configured.")

    resend.api_key = settings.resend_api_key

    try:
        resend.Emails.send(
            {
                "from": f"{settings.email_from_name} <{settings.email_from_address}>",
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text,
            }
        )
    except Exception as exc:
        logger.exception("Failed to send email to %s.", to)
        raise EmailDeliveryError("Failed to send email.") from exc
