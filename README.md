# Neo Claw — GoHighLevel Sales Chatbot POC

A client-facing proof of concept showing how Neo Claw can plug directly into **GoHighLevel (GHL)** for inbound conversation handling, AI-generated sales replies, tagging, workflow triggering, voice notes, and reusable snapshot cloning.

## What this POC demonstrates

- **GoHighLevel-specific integration surface**
  - inbound **Conversations webhook** handler
  - contact **tag sync**
  - **workflow triggering**
  - outbound **message sending** via GHL API
- **Sales conversation AI**
  - intent detection for inquiry, objection, purchase intent, unsubscribe
  - brand-voiced responses using **OpenAI GPT-4o**
  - mock mode when no API key is present
- **Voice note generation**
  - ElevenLabs text-to-speech support
  - graceful demo fallback when voice credentials are missing
- **Snapshot duplication model**
  - generates a complete GHL-style snapshot payload
  - clones a base client setup with target overrides for multi-client rollout

---

## Architecture

```text
                ┌──────────────────────────────┐
                │      GoHighLevel (GHL)       │
                │ Conversations / Workflows    │
                │ Contacts / Tags / Pipelines  │
                └──────────────┬───────────────┘
                               │ webhook
                               ▼
                ┌──────────────────────────────┐
                │ POST /webhooks/ghl/conversation │
                │       ghl-webhook.js          │
                └──────────────┬───────────────┘
                               │
                 ┌─────────────┼──────────────┐
                 │             │              │
                 ▼             ▼              ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ ai-engine.js │ │  ghl-api.js  │ │voice-notes.js│
        │ GPT-4o reply │ │ tags/workflow│ │ ElevenLabs   │
        │ intent/tags  │ │ send message │ │ TTS output   │
        └──────┬───────┘ └──────┬───────┘ └──────────────┘
               │                │
               └────────┬───────┘
                        ▼
              ┌──────────────────────┐
              │   Snapshot System    │
              │    snapshot.js       │
              │ generate / clone     │
              └──────────────────────┘
```

---

## Project structure

```text
.
├── server.js
├── package.json
├── .env.example
├── public/
│   └── voice-notes/
└── src/
    ├── ai-engine.js
    ├── ghl-api.js
    ├── ghl-webhook.js
    ├── snapshot.js
    └── voice-notes.js
```

---

## GHL integration

### 1) Conversations webhook setup

Configure GHL to send inbound conversation events to:

```text
POST /webhooks/ghl/conversation
```

Expected payload format:

```json
{
  "type": "InboundMessage",
  "contactId": "contact_123",
  "locationId": "location_abc",
  "conversationId": "conv_456",
  "messageBody": "How much does this cost?",
  "channel": "sms",
  "attachments": []
}
```

The webhook handler:

- returns **200 immediately**
- processes the payload asynchronously
- detects the sales intent
- suggests and applies tags
- triggers the right workflow
- sends a reply back through GHL

### 2) Workflow mapping

Workflow IDs are supplied via `GHL_WORKFLOW_IDS` as JSON.

Example:

```env
GHL_WORKFLOW_IDS={"newLead":"wf_new_lead","followUpDay1":"wf_follow_up_day_1","followUpDay3":"wf_follow_up_day_3","followUpDay5":"wf_follow_up_day_5","objectionHandler":"wf_objection_handler","purchaseDetected":"wf_purchase_detected","onboarding":"wf_onboarding"}
```

Mapped workflows in the snapshot model:

- `new-lead`
- `follow-up-day-1`
- `follow-up-day-3`
- `follow-up-day-5`
- `objection-handler`
- `purchase-detected`
- `onboarding`

### 3) Tagging system

Intent-driven tags:

- `lead`
- `engaged`
- `objection`
- `purchase-intent`
- `purchased`
- `stop-sales`
- `churned`

Typical logic:

- **sales inquiry** → `lead`, `engaged`
- **objection** → `engaged`, `objection`
- **purchase intent** → `engaged`, `purchase-intent`
- **unsubscribe** → `stop-sales`

---

## Conversation AI flow

1. GHL sends an inbound conversation webhook
2. `ghl-webhook.js` parses the payload
3. `ai-engine.js` classifies intent and generates a brand-voiced reply
4. `ghl-api.js` applies tags and triggers any matching workflow
5. `ghl-api.js` sends the reply back into the GHL conversation thread
6. `/admin/overview` exposes recent events for lightweight review

### AI reply endpoint

```text
POST /conversations/ai-reply
```

Use this endpoint to test message handling without waiting for a live GHL webhook.

---

## Voice note integration

### ElevenLabs support

```text
POST /voice-notes/generate
```

Request body:

```json
{
  "text": "Thanks for reaching out — here’s the fastest way to get started.",
  "voiceId": "optional_override_voice_id"
}
```

Response:

```json
{
  "url": "/voice-notes/1711111111111-uuid.mp3",
  "demoMode": false
}
```

If `ELEVENLABS_API_KEY` is not configured, the endpoint falls back gracefully and returns a text placeholder file instead of failing.

This keeps the POC demoable even before production voice credentials are available.

---

## Snapshot system

### Generate a full snapshot payload

```text
POST /snapshot/generate
```

The snapshot includes:

- `customValues`
  - `brandName`
  - `offer`
  - `voiceId`
  - `joinLink`
  - `testimonials[]`
- `workflows[]`
- `pipelines[]`
- `tags[]`
- `systemPrompts`

### Clone for a new client

```text
POST /snapshot/clone
```

Request body:

```json
{
  "sourceConfig": {
    "brandName": "Client A",
    "offer": "Credit repair growth system",
    "joinLink": "https://client-a.example.com/book"
  },
  "targetOverrides": {
    "customValues": {
      "brandName": "Client B",
      "joinLink": "https://client-b.example.com/book"
    },
    "systemPrompts": {
      "sales": "Use a more premium and authority-led tone."
    }
  }
}
```

This is the duplication layer that turns one strong POC into a repeatable deployment pattern for multiple GHL client accounts.

---


## Webhook security

The conversation webhook now supports **HMAC-SHA256 signature verification** using `GHL_WEBHOOK_SECRET`.

- Header support: `x-ghl-signature` or `x-wh-signature`
- Invalid signatures return `401`
- If no secret is configured, the POC stays in demo-friendly mode

---

## Inbound audio and transcription

If a webhook includes an audio attachment, the handler will:

1. detect the voice-note/media attachment
2. download it temporarily
3. transcribe it with OpenAI when configured
4. fall back to a mock transcript in demo mode
5. feed the transcript into the same sales AI flow

This closes the gap on voice-note handling instead of only gesturing at it.

---

## QA / demo assets

## Multimedia messaging

The POC now supports attachment-aware outbound replies.

- inbound webhook attachments are preserved
- audio attachments can be transcribed and interpreted
- outbound replies can include attachments through `sendMessageWithAttachments(...)`

This makes the messaging layer closer to a real GHL Conversations workflow instead of plain text only.

---

## Persistent admin overview

`/admin/overview` now reads from a lightweight JSON-backed event store:

- recent events persisted to `data/events.json`
- lead and follow-up counts persist across restarts

---

## Signed webhook generator

For QA, generate a signed sample payload with:

```bash
node scripts/generate-signed-webhook.js
```

This prints:

- a sample payload
- a matching HMAC signature
- a ready-to-run curl command

---


Included in the repo:

- `postman.collection.json` — ready-made API collection
- `docs/curl-examples.sh` — curl test pack for local QA

---

## API endpoints

### Core endpoints

- `GET /health`
- `GET /admin/overview`
- `POST /webhooks/ghl/conversation`
- `POST /conversations/ai-reply`
- `POST /contacts/tag`
- `POST /workflows/trigger`
- `POST /voice-notes/generate`
- `POST /snapshot/generate`
- `POST /snapshot/clone`

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set the following values:

- `GHL_API_KEY`
- `GHL_LOCATION_ID`
- `GHL_WORKFLOW_IDS`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `DEFAULT_BRAND_VOICE`
- `PORT`

### 3. Run the server

```bash
npm run dev
```

or

```bash
npm start
```

---

## Demo mode behaviour

This POC is intentionally usable even without live credentials.

If no `GHL_API_KEY` is set:
- API calls are simulated and logged
- tag/workflow/message actions return mocked payloads

If no `OPENAI_API_KEY` is set:
- AI replies use deterministic mocked sales logic

If no `ELEVENLABS_API_KEY` is set:
- voice notes fall back to placeholder text assets

That makes the POC safe to demo before client secrets are connected.

---

## Notes for client delivery

This code is structured as a **GoHighLevel-specific proof of concept**, not a generic Express chatbot shell.

It demonstrates the commercial surfaces that matter in a real deployment:

- GHL webhook ingestion
- tagging and workflow orchestration
- branded AI replies
- multimedia support via voice notes
- snapshot generation and duplication for scale

For production, the next logical step would be:

- webhook signature verification
- persistent event storage
- contact/profile enrichment
- attachment-aware AI processing
- audio transcription for inbound voice notes
- deployment behind a secure public webhook URL
