# GHL Sales Chatbot

A FastAPI backend that integrates with GoHighLevel (GHL) CRM to receive contact webhooks, score leads, and run GPT-4o-powered sales conversations that automatically tag contacts based on engagement level.

## What This Does

1. **GHL webhook receiver** (`POST /webhook/ghl`)
   - Receives contact/conversation webhooks from GoHighLevel
   - Extracts contact info (name, email, phone, tags)
   - Computes an initial lead score (0–100) based on profile completeness

2. **Sales chat** (`POST /chat`)
   - Accepts a message and a GHL `contact_id`
   - Sends the message to OpenAI GPT-4o with a sales-focused system prompt
   - Scores the contact based on intent signals in the message
   - Calls `tag_contact()` to apply `hot-lead`, `warm-lead`, or `cold-lead` tags in GHL

3. **Lead scoring** (`lead_score()`)
   - Returns 0–100 based on fields present: email (+20), phone (+20), first/last name (+10 each), intent tags (+15 each)

4. **GHL tagging** (`tag_contact()`)
   - Makes a real `POST` call to `https://services.leadconnectorhq.com/contacts/{id}/tags`
   - Uses the GHL REST API with Bearer token auth

## Setup

```bash
cp .env.example .env
# Fill in your GHL and OpenAI credentials
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

## Environment Variables

| Variable | Description |
|---|---|
| `GHL_API_KEY` | GoHighLevel API key (Bearer token) |
| `GHL_LOCATION_ID` | GHL Location/Sub-account ID |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o access |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhook/ghl` | Receive GHL contact webhook, return lead score |
| `POST` | `/chat` | Chat with GPT-4o, tag contact based on score |
| `GET` | `/health` | Health check |

## GHL Webhook Setup

In your GHL account:
1. Go to **Settings → Webhooks**
2. Create a new webhook pointing to `https://your-domain.com/webhook/ghl`
3. Subscribe to: **Contact Created**, **Contact Updated**, **Conversation Message**

## Scoring Thresholds

| Score | Tag Applied |
|---|---|
| 70–100 | `hot-lead` |
| 40–69 | `warm-lead` |
| 0–39 | `cold-lead` |

## Tech Stack

- **FastAPI** — REST API framework
- **OpenAI GPT-4o** — sales conversation AI
- **httpx** — async HTTP client for GHL REST API calls
- **Pydantic v2** — request/response validation
- **Uvicorn** — ASGI server
