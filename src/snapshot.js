function buildWorkflows(workflowIds = {}) {
  return [
    { key: 'new-lead', workflowId: workflowIds.newLead || null, trigger: 'new inbound lead' },
    { key: 'follow-up-day-1', workflowId: workflowIds.followUpDay1 || null, trigger: '1 day after no response' },
    { key: 'follow-up-day-3', workflowId: workflowIds.followUpDay3 || null, trigger: '3 days after no response' },
    { key: 'follow-up-day-5', workflowId: workflowIds.followUpDay5 || null, trigger: '5 days after no response' },
    { key: 'objection-handler', workflowId: workflowIds.objectionHandler || null, trigger: 'objection detected' },
    { key: 'purchase-detected', workflowId: workflowIds.purchaseDetected || null, trigger: 'purchase intent or paid' },
    { key: 'onboarding', workflowId: workflowIds.onboarding || null, trigger: 'sale closed / onboarding start' },
  ];
}

export function generateSnapshot(brandConfig = {}) {
  const workflowIds = brandConfig.workflowIds || {};

  return {
    snapshotName: `${brandConfig.brandName || 'Neo Claw'} Sales Chatbot Snapshot`,
    generatedAt: new Date().toISOString(),
    customValues: {
      brandName: brandConfig.brandName || 'Neo Claw',
      offer: brandConfig.offer || 'Done-for-you AI sales qualification',
      voiceId: brandConfig.voiceId || process.env.ELEVENLABS_VOICE_ID || null,
      joinLink: brandConfig.joinLink || 'https://example.com/book',
      testimonials: brandConfig.testimonials || [
        'Fast implementation with clear ROI visibility.',
        'Higher lead response rates within the first week.',
      ],
    },
    workflows: buildWorkflows(workflowIds),
    pipelines: [
      {
        key: 'credit-repair-sales',
        stages: ['New Lead', 'Contacted', 'Objection', 'Purchase Intent', 'Sold', 'Churned'],
      },
    ],
    tags: ['lead', 'engaged', 'objection', 'purchase-intent', 'purchased', 'stop-sales', 'churned'],
    systemPrompts: {
      sales: `Speak in a ${brandConfig.voiceStyle || process.env.DEFAULT_BRAND_VOICE || 'direct, credible, consultative'} tone. Qualify leads, answer questions, and move them toward booking or purchase.`,
      'objection-handling': 'Address price, trust, timing, and fit objections with empathy and proof. Offer the next best step rather than pushing aggressively.',
      onboarding: 'Once a purchase is detected, confirm next steps, set expectations, and move the customer into onboarding cleanly.',
    },
  };
}

function deepMerge(base, overrides) {
  if (Array.isArray(base) || Array.isArray(overrides)) {
    return overrides ?? base;
  }

  const output = { ...base };
  for (const [key, value] of Object.entries(overrides || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      output[key] = deepMerge(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

export function cloneSnapshot(sourceConfig = {}, targetOverrides = {}) {
  const baseSnapshot = generateSnapshot(sourceConfig);
  return deepMerge(baseSnapshot, targetOverrides);
}
