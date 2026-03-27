import axios from 'axios';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

function getConfig(overrides = {}) {
  return {
    apiKey: overrides.apiKey || process.env.GHL_API_KEY,
    locationId: overrides.locationId || process.env.GHL_LOCATION_ID,
  };
}

function createHeaders(apiKey, locationId) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
    ...(locationId ? { locationId } : {}),
  };
}

function isDemoMode(apiKey) {
  return !apiKey;
}

async function simulate(action, payload) {
  const result = {
    demoMode: true,
    action,
    payload,
    timestamp: new Date().toISOString(),
  };
  console.log(`[GHL DEMO] ${action}`, payload);
  return result;
}

export async function addContactTag(locationId, contactId, tag) {
  const cfg = getConfig({ locationId });
  if (isDemoMode(cfg.apiKey)) {
    return simulate('addContactTag', { locationId: cfg.locationId, contactId, tag });
  }

  const response = await axios.post(
    `${GHL_BASE_URL}/contacts/${contactId}/tags`,
    { tags: [tag] },
    { headers: createHeaders(cfg.apiKey, cfg.locationId) }
  );

  return response.data;
}

export async function removeContactTag(locationId, contactId, tag) {
  const cfg = getConfig({ locationId });
  if (isDemoMode(cfg.apiKey)) {
    return simulate('removeContactTag', { locationId: cfg.locationId, contactId, tag });
  }

  const response = await axios.delete(`${GHL_BASE_URL}/contacts/${contactId}/tags`, {
    headers: createHeaders(cfg.apiKey, cfg.locationId),
    data: { tags: [tag] },
  });

  return response.data;
}

export async function triggerWorkflow(locationId, contactId, workflowId) {
  const cfg = getConfig({ locationId });
  if (isDemoMode(cfg.apiKey)) {
    return simulate('triggerWorkflow', {
      locationId: cfg.locationId,
      contactId,
      workflowId,
    });
  }

  const response = await axios.post(
    `${GHL_BASE_URL}/workflows/${workflowId}/execute`,
    {
      contactId,
      locationId: cfg.locationId,
    },
    { headers: createHeaders(cfg.apiKey, cfg.locationId) }
  );

  return response.data;
}

export async function sendMessage(locationId, conversationId, body, channel = 'sms') {
  const cfg = getConfig({ locationId });
  if (isDemoMode(cfg.apiKey)) {
    return simulate('sendMessage', {
      locationId: cfg.locationId,
      conversationId,
      body,
      channel,
    });
  }

  const response = await axios.post(
    `${GHL_BASE_URL}/conversations/messages`,
    {
      type: channel,
      conversationId,
      message: body,
    },
    { headers: createHeaders(cfg.apiKey, cfg.locationId) }
  );

  return response.data;
}

export async function sendMessageWithAttachments(locationId, conversationId, body, channel = 'sms', attachments = []) {
  const cfg = getConfig({ locationId });
  if (isDemoMode(cfg.apiKey)) {
    return simulate('sendMessageWithAttachments', {
      locationId: cfg.locationId,
      conversationId,
      body,
      channel,
      attachments,
    });
  }

  const response = await axios.post(
    `${GHL_BASE_URL}/conversations/messages`,
    {
      type: channel,
      conversationId,
      message: body,
      attachments,
    },
    { headers: createHeaders(cfg.apiKey, cfg.locationId) }
  );

  return response.data;
}
