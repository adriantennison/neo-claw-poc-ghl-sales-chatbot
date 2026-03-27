from typing import Optional
from utils.logger import get_logger

logger = get_logger(__name__)

INTENT_KEYWORDS = {
    "price", "cost", "buy", "purchase", "book", "schedule",
    "demo", "call", "quote", "order", "interested", "sign up",
}


def lead_score(contact: Optional[dict], user_message: str = "") -> int:
    """
    Score a lead 0-100 based on real GHL contact data and message intent.

    contact: dict from GHL GET /contacts/{id} (may be None if fetch failed)
    user_message: the latest message text for intent detection
    """
    score = 0

    if contact:
        if contact.get("email"):
            score += 20
        if contact.get("phone"):
            score += 20
        if contact.get("firstName"):
            score += 10
        if contact.get("lastName"):
            score += 10
        # Intent signals from existing tags
        tags = contact.get("tags", [])
        if any(kw in tag.lower() for tag in tags for kw in INTENT_KEYWORDS):
            score += 15

    # Intent from current message
    message_words = set(user_message.lower().split())
    if message_words & INTENT_KEYWORDS:
        score += 20

    score = min(score, 100)
    logger.info(f"Lead score={score} (contact={'present' if contact else 'missing'}, msg_intent={bool(message_words & INTENT_KEYWORDS)})")
    return score


def score_to_tag(score: int) -> str:
    if score >= 70:
        return "hot-lead"
    elif score >= 40:
        return "warm-lead"
    return "cold-lead"
