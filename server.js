import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { processGhlConversationWebhook } from './src/ghl-webhook.js';
import { addContactTag, removeContactTag, sendMessage, triggerWorkflow } from './src/ghl-api.js';
import { generateReply } from './src/ai-engine.js';
import { serveVoiceNote } from './src/voice-notes.js';
import { cloneSnapshot, generateSnapshot } from './src/snapshot.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const recentEvents = [];
const adminState = {
  leads: 0,
  followUpsTriggered: 0,
};

app.use(express.json({ limit: '2mb' }));
app.use('/voice-notes', express.static(path.join(__dirname, 'public', 'voice-notes')));

function parseWorkflowIds() {
  try {
    return JSON.parse(process.env.GHL_WORKFLOW_IDS || '{}');
  } catch {
    return {};
  }
}

function defaultBrandConfig(locationId = process.env.GHL_LOCATION_ID) {
  return {
    brandName: 'Neo Claw',
    offer: 'AI-assisted sales qualification and automated follow-up',
    voiceId: process.env.ELEVENLABS_VOICE_ID || null,
    voiceStyle: process.env.DEFAULT_BRAND_VOICE,
    joinLink: 'https://example.com/book',
    locationId,
    workflowIds: parseWorkflowIds(),
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ghl-sales-chatbot-poc', timestamp: new Date().toISOString() });
});

app.post('/webhooks/ghl/conversation', (req, res) => {
  res.status(200).json({ received: true, async: true });

  setImmediate(async () => {
    try {
      const event = await processGhlConversationWebhook(req.body, recentEvents);
      adminState.leads += 1;
      if (['objection', 'purchase_intent'].includes(event.ai.intent)) {
        adminState.followUpsTriggered += 1;
      }
    } catch (error) {
      console.error('Failed to process GHL webhook:', error.response?.data || error.message);
      recentEvents.unshift({
        receivedAt: new Date().toISOString(),
        type: 'error',
        error: error.response?.data || error.message,
      });
    }
  });
});

app.post('/voice-notes/generate', async (req, res) => {
  try {
    const { text, voiceId } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text is required' });
    const result = await serveVoiceNote(text, voiceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.post('/snapshot/generate', (req, res) => {
  const snapshot = generateSnapshot(req.body?.brandConfig || req.body || {});
  res.json(snapshot);
});

app.post('/snapshot/clone', (req, res) => {
  const { sourceConfig = {}, targetOverrides = {} } = req.body || {};
  const snapshot = cloneSnapshot(sourceConfig, targetOverrides);
  res.json(snapshot);
});

app.post('/conversations/ai-reply', async (req, res) => {
  try {
    const { leadProfile = {}, message = '', brandConfig = {}, locationId, conversationId, channel = 'sms', send = false } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message is required' });

    const mergedBrandConfig = { ...defaultBrandConfig(locationId), ...brandConfig };
    const aiResult = await generateReply(leadProfile, message, mergedBrandConfig);

    let delivery = null;
    if (send && conversationId) {
      delivery = await sendMessage(locationId || process.env.GHL_LOCATION_ID, conversationId, aiResult.reply, channel);
    }

    recentEvents.unshift({
      receivedAt: new Date().toISOString(),
      type: 'ai-reply',
      leadProfile,
      message,
      ai: aiResult,
    });
    if (recentEvents.length > 50) recentEvents.pop();

    res.json({ ...aiResult, delivery });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.post('/contacts/tag', async (req, res) => {
  try {
    const { action = 'add', locationId, contactId, tag } = req.body || {};
    if (!contactId || !tag) return res.status(400).json({ error: 'contactId and tag are required' });

    const result = action === 'remove'
      ? await removeContactTag(locationId, contactId, tag)
      : await addContactTag(locationId, contactId, tag);

    res.json({ action, result });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.post('/workflows/trigger', async (req, res) => {
  try {
    const { locationId, contactId, workflowId } = req.body || {};
    if (!contactId || !workflowId) return res.status(400).json({ error: 'contactId and workflowId are required' });
    const result = await triggerWorkflow(locationId, contactId, workflowId);
    adminState.followUpsTriggered += 1;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.get('/admin/overview', (_req, res) => {
  res.json({
    leads: adminState.leads,
    followUpsTriggered: adminState.followUpsTriggered,
    recentEvents: recentEvents.slice(0, 20),
  });
});

app.listen(port, () => {
  console.log(`GHL Sales Chatbot POC listening on port ${port}`);
});
