import os
from collections import deque
from openai import AsyncOpenAI
from utils.logger import get_logger

logger = get_logger(__name__)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = (
    "You are an expert sales assistant. Your goal is to qualify leads and guide them "
    "toward booking a demo or purchase. Be friendly, professional, and concise."
)

MAX_HISTORY = 20

# In-memory conversation history keyed by contact_id, capped at last 20 messages
_histories: dict[str, deque] = {}


async def get_ai_response(contact_id: str, user_message: str) -> str:
    """Get GPT-4o response with full conversation history for this contact."""
    if contact_id not in _histories:
        _histories[contact_id] = deque(maxlen=MAX_HISTORY)

    _histories[contact_id].append({"role": "user", "content": user_message})
    logger.info(f"GPT-4o called: contact_id={contact_id}, history_len={len(_histories[contact_id])}")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + list(_histories[contact_id])

    completion = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=300,
        temperature=0.7,
    )
    reply = completion.choices[0].message.content.strip()
    _histories[contact_id].append({"role": "assistant", "content": reply})
    logger.info(f"GPT-4o response: contact_id={contact_id}: {reply[:80]}")
    return reply
