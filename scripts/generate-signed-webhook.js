#!/usr/bin/env node
import crypto from 'crypto';

const secret = process.env.GHL_WEBHOOK_SECRET || 'demo-secret';
const payload = {
  type: 'InboundMessage',
  contactId: 'contact_123',
  locationId: 'location_abc',
  conversationId: 'conv_456',
  messageBody: 'I want to buy but I have one last question.',
  channel: 'sms',
  attachments: []
};

const raw = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');

console.log(JSON.stringify({
  payload,
  signature,
  curl: `curl -X POST http://localhost:3000/webhooks/ghl/conversation -H 'Content-Type: application/json' -H 'x-ghl-signature: ${signature}' -d '${raw}'`
}, null, 2));
