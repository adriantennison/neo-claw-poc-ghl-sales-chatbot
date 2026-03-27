#!/usr/bin/env bash

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "== health =="
curl -s "$BASE_URL/health" | jq .

echo "\n== ai reply =="
curl -s -X POST "$BASE_URL/conversations/ai-reply" \
  -H 'Content-Type: application/json' \
  -d '{
    "leadProfile": {"contactId": "contact_123", "name": "Jane Prospect"},
    "message": "How much does this cost?",
    "brandConfig": {
      "brandName": "Neo Claw",
      "offer": "AI-assisted sales qualification",
      "joinLink": "https://example.com/book"
    }
  }' | jq .

echo "\n== webhook simulation =="
curl -s -X POST "$BASE_URL/webhooks/ghl/conversation" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "InboundMessage",
    "contactId": "contact_123",
    "locationId": "location_abc",
    "conversationId": "conv_456",
    "messageBody": "I want to sign up",
    "channel": "sms",
    "attachments": []
  }' | jq .

echo "\n== admin overview =="
curl -s "$BASE_URL/admin/overview" | jq .
