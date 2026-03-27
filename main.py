import os
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="GHL Sales Chatbot")
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

GHL_API_KEY = os.getenv("GHL_API_KEY", "")
GHL_LOCATION_ID = os.getenv("GHL_LOCATION_ID", "")
GHL_BASE_URL = "https://services.leadconnectorhq.com"

SYSTEM_PROMPT = (
    "You are a sales assistant chatbot for a business using GoHighLevel CRM. "
    "Your goal is to qualify leads, answer product questions, and guide prospects "
    "toward booking a call or making a purchase. Be concise and helpful."
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class GHLWebhookPayload(BaseModel):
    contactId: str | None = None
    contact_id: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None
    phone: str | None = None
    tags: list[str] | None = None
    # Accept any extra fields from GHL webhook
    model_config = {"extra": "allow"}


class ChatRequest(BaseModel):
    message: str
    contact_id: str


class ChatResponse(BaseModel):
    reply: str
    contact_id: str
    lead_score: int
    tags_applied: list[str]


# ---------------------------------------------------------------------------
# GHL helper functions
# ---------------------------------------------------------------------------

async def tag_contact(contact_id: str, tag: str) -> dict:
    """
    Add a tag to a GHL contact via the REST API.
    POST https://services.leadconnectorhq.com/contacts/{id}/tags
    """
    url = f"{GHL_BASE_URL}/contacts/{contact_id}/tags"
    headers = {
        "Authorization": f"Bearer {GHL_API_KEY}",
        "Content-Type": "application/json",
        "Version": "2021-07-28",
    }
    payload = {"tags": [tag]}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=10.0)
        response.raise_for_status()
        return response.json()


def lead_score(contact_data: dict) -> int:
    """
    Score a contact 0-100 based on fields present in their data.
    More complete profiles = higher score.
    """
    score = 0

    # Basic contact info
    if contact_data.get("email"):
        score += 20
    if contact_data.get("phone"):
        score += 20
    if contact_data.get("firstName"):
        score += 10
    if contact_data.get("lastName"):
        score += 10

    # Engagement signals
    tags = contact_data.get("tags") or []
    if "interested" in tags:
        score += 15
    if "hot-lead" in tags:
        score += 15
    if "booked-call" in tags:
        score += 10

    return min(score, 100)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/webhook/ghl")
async def ghl_webhook(payload: GHLWebhookPayload):
    """
    Receives a GHL contact/conversation webhook.
    Extracts contact info and computes initial lead score.
    """
    contact_id = payload.contactId or payload.contact_id
    contact_data = payload.model_dump()

    score = lead_score(contact_data)

    return {
        "received": True,
        "contact_id": contact_id,
        "lead_score": score,
        "contact_data": {
            "name": f"{payload.firstName or ''} {payload.lastName or ''}".strip(),
            "email": payload.email,
            "phone": payload.phone,
            "tags": payload.tags,
        },
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Accept a message and contact_id.
    Gets a GPT-4o response, scores the contact, and applies tags based on score.
    """
    # Get GPT-4o response
    completion = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": request.message},
        ],
        max_tokens=300,
        temperature=0.7,
    )
    reply = completion.choices[0].message.content.strip()

    # Build contact data from the message context for scoring
    contact_data: dict = {"contact_id": request.contact_id}

    # Simple intent signals from the message
    msg_lower = request.message.lower()
    if any(word in msg_lower for word in ["price", "cost", "buy", "purchase", "interested"]):
        contact_data["tags"] = ["interested"]
    if any(word in msg_lower for word in ["book", "call", "schedule", "demo"]):
        contact_data["tags"] = contact_data.get("tags", []) + ["booked-call"]

    score = lead_score(contact_data)

    # Tag contact in GHL based on score
    tags_applied: list[str] = []

    if GHL_API_KEY:
        try:
            if score >= 70:
                await tag_contact(request.contact_id, "hot-lead")
                tags_applied.append("hot-lead")
            elif score >= 40:
                await tag_contact(request.contact_id, "warm-lead")
                tags_applied.append("warm-lead")
            else:
                await tag_contact(request.contact_id, "cold-lead")
                tags_applied.append("cold-lead")
        except httpx.HTTPError:
            # Non-fatal: log and continue
            pass

    return ChatResponse(
        reply=reply,
        contact_id=request.contact_id,
        lead_score=score,
        tags_applied=tags_applied,
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
