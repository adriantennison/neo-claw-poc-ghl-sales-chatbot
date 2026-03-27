from fastapi import APIRouter, Request, HTTPException
from services.ghl_service import verify_ghl_webhook, get_contact
from services.scoring import lead_score, score_to_tag
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.post("/webhook/ghl")
async def ghl_webhook(request: Request):
    """Receive GHL contact webhooks, score the lead, return tag."""
    body = await request.body()
    signature = request.headers.get("x-ghl-signature", "")

    if not verify_ghl_webhook(body, signature):
        logger.warning("GHL webhook signature validation failed")
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    contact_id = payload.get("contactId") or payload.get("contact_id", "")
    event_type = payload.get("type", "unknown")
    logger.info(f"GHL webhook: event={event_type}, contact_id={contact_id}")

    contact = await get_contact(contact_id) if contact_id else None
    score = lead_score(contact)
    tag = score_to_tag(score)

    return {"contact_id": contact_id, "event": event_type, "score": score, "tag": tag}
