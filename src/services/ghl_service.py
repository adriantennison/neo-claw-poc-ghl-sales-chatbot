import os
import hmac
import hashlib
from typing import Optional
import httpx
from utils.logger import get_logger

logger = get_logger(__name__)

GHL_API_BASE = "https://services.leadconnectorhq.com"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.getenv('GHL_API_KEY', '')}",
        "Content-Type": "application/json",
        "Version": "2021-07-28",
    }


async def get_contact(contact_id: str) -> Optional[dict]:
    """Fetch real contact data from GHL API."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get(
                f"{GHL_API_BASE}/contacts/{contact_id}",
                headers=_headers(),
            )
            r.raise_for_status()
            data = r.json()
            return data.get("contact", data)
    except httpx.HTTPStatusError as e:
        logger.error(f"GHL get_contact failed: contact_id={contact_id}, status={e.response.status_code}")
        return None
    except Exception as e:
        logger.error(f"GHL get_contact unexpected error: contact_id={contact_id}: {e}")
        return None


async def tag_contact(contact_id: str, tag: str) -> bool:
    """Apply a tag to a GHL contact via v2 API."""
    location_id = os.getenv("GHL_LOCATION_ID", "")
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(
                f"{GHL_API_BASE}/contacts/{contact_id}/tags",
                json={"tags": [tag], "locationId": location_id},
                headers=_headers(),
            )
            r.raise_for_status()
            logger.info(f"Tagged contact {contact_id} with '{tag}'")
            return True
    except httpx.HTTPStatusError as e:
        logger.error(f"GHL tag_contact failed: contact_id={contact_id}, tag={tag}, status={e.response.status_code}, body={e.response.text[:200]}")
        return False
    except Exception as e:
        logger.error(f"GHL tag_contact unexpected error: contact_id={contact_id}: {e}")
        return False


def verify_ghl_webhook(payload: bytes, signature: str) -> bool:
    """Validate GHL webhook HMAC-SHA256 signature."""
    secret = os.getenv("GHL_WEBHOOK_SECRET", "")
    if not secret:
        logger.warning("GHL_WEBHOOK_SECRET not set — skipping webhook signature validation")
        return True
    expected = hmac.new(secret.encode(), payload, digestmod=hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
