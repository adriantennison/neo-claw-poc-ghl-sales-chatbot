import { generateReply } from './ai-engine.js';
import { addContactTag, sendMessage, triggerWorkflow } from './ghl-api.js';

function parseWorkflowIds() {
  try {
    return JSON.parse(process.env.GHL_WORKFLOW_IDS || '{}');
  } catch {
    return {};
  }
}

function buildBrandConfig(locationId) {
  return {
    brandName: 'Neo Claw',
    offer: 'AI-assisted lead qualification and sales follow-up',
    joinLink: 'https://example.com/book',
    voiceId: process.env.ELEVENLABS_VOICE_ID || null,
    voiceStyle: process.env.DEFAULT_BRAND_VOICE,
    locationId,
    workflowIds: parseWorkflowIds(),
  };
}

export async function processGhlConversationWebhook(payload, eventStore = []) {
  const {
    type,
    contactId,
    locationId = process.env.GHL_LOCATION_ID,
    conversationId,
    messageBody = '',
    channel = 'sms',
    attachments = [],
  } = payload || {};

  const brandConfig = buildBrandConfig(locationId);
  const leadProfile = {
    contactId,
    locationId,
    conversationId,
    channel,
    attachments,
  };

  const aiResult = await generateReply(leadProfile, messageBody, brandConfig);

  for (const tag of aiResult.suggestedTags || []) {
    await addContactTag(locationId, contactId, tag);
  }

  if (aiResult.intent === 'objection' && brandConfig.workflowIds.objectionHandler) {
    await triggerWorkflow(locationId, contactId, brandConfig.workflowIds.objectionHandler);
  }

  if (aiResult.intent === 'purchase_intent' && brandConfig.workflowIds.purchaseDetected) {
    await triggerWorkflow(locationId, contactId, brandConfig.workflowIds.purchaseDetected);
  }

  if (aiResult.intent === 'unsubscribe') {
    await addContactTag(locationId, contactId, 'stop-sales');
  }

  await sendMessage(locationId, conversationId, aiResult.reply, channel);

  const event = {
    receivedAt: new Date().toISOString(),
    type,
    contactId,
    locationId,
    conversationId,
    messageBody,
    channel,
    attachments,
    ai: aiResult,
  };

  eventStore.unshift(event);
  if (eventStore.length > 50) eventStore.pop();

  return event;
}
