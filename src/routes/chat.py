from fastapi import APIRouter
from pydantic import BaseModel
from services.ghl_service import get_contact, tag_contact
from services.openai_service import get_ai_response
from services.scoring import lead_score, score_to_tag
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    contact_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    score: int
    tag: str


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    """Process a chat message: fetch contact, score lead, tag in GHL, get AI reply."""
    logger.info(f"Chat: contact_id={payload.contact_id}")

    # Fetch real contact data from GHL for accurate scoring
    contact = await get_contact(payload.contact_id)

    # Score based on real contact data + message intent
    score = lead_score(contact, payload.message)
    tag = score_to_tag(score)

    # Apply tag in GHL (non-blocking failure — already logged in ghl_service)
    await tag_contact(payload.contact_id, tag)

    # Get AI response with full conversation memory
    reply = await get_ai_response(payload.contact_id, payload.message)

    logger.info(f"Chat complete: contact_id={payload.contact_id}, score={score}, tag={tag}")
    return ChatResponse(reply=reply, score=score, tag=tag)
