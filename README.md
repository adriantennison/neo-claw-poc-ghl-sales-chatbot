# neo-claw-poc-ghl-sales-chatbot

FastAPI backend integrating with GoHighLevel CRM for lead scoring, webhook validation, and GPT-4o sales conversations.

## Features

- **AsyncOpenAI** — non-blocking GPT-4o calls (fixed blocking sync bug)
- **Conversation memory** — per-contact history (capped at 20 messages) passed to GPT-4o
- **Real contact data** — fetches GHL contact before scoring (email, phone, tags)
- **GHL webhook signature validation** — HMAC-SHA256 via `GHL_WEBHOOK_SECRET`
- **GHL v2 API tagging** — `locationId` correctly passed per v2 spec
- **Proper error logging** — no silent `except: pass` anywhere

## Structure

```
src/
├── main.py
├── routes/
│   ├── webhook.py          # POST /webhook/ghl
│   └── chat.py             # POST /chat
├── services/
│   ├── ghl_service.py      # get_contact, tag_contact, verify_ghl_webhook
│   ├── openai_service.py   # AsyncOpenAI with conversation memory
│   └── scoring.py          # lead_score() with real contact data
└── utils/logger.py
tests/
└── test_scoring.py
```

## Setup

```bash
cp .env.example .env
pip install -r requirements.txt
cd src && uvicorn main:app --reload
```

## Tests

```bash
pytest tests/
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/ghl` | GHL contact webhook (signature validated) |
| POST | `/chat` | Chat with GPT-4o, score + tag contact |
| GET | `/health` | Health check |

## Environment Variables

| Variable | Description |
|---|---|
| `GHL_API_KEY` | GHL Bearer token |
| `GHL_LOCATION_ID` | GHL Location/Sub-account ID (required for tagging) |
| `GHL_WEBHOOK_SECRET` | Secret for webhook HMAC-SHA256 validation |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o |

## Scoring

| Score | Tag |
|-------|-----|
| 70–100 | `hot-lead` |
| 40–69 | `warm-lead` |
| 0–39 | `cold-lead` |
