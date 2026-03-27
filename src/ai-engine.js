import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function detectIntent(message = '') {
  const text = message.toLowerCase();

  if (/stop|unsubscribe|leave me alone|remove me/.test(text)) return 'unsubscribe';
  if (/buy|sign up|join|pay|purchase|ready to start|let's do it/.test(text)) return 'purchase_intent';
  if (/too expensive|not sure|need to think|busy|later|already working with|skeptical|scam/.test(text)) return 'objection';
  return 'sales_inquiry';
}

function tagsForIntent(intent) {
  switch (intent) {
    case 'unsubscribe':
      return ['stop-sales'];
    case 'purchase_intent':
      return ['engaged', 'purchase-intent'];
    case 'objection':
      return ['engaged', 'objection'];
    case 'sales_inquiry':
    default:
      return ['lead', 'engaged'];
  }
}

function buildMockReply(intent, message, brandConfig = {}) {
  const brandName = brandConfig.brandName || 'your business';
  const offer = brandConfig.offer || 'your offer';
  const joinLink = brandConfig.joinLink || 'https://example.com/book';

  switch (intent) {
    case 'unsubscribe':
      return `Understood — I’ll stop sales follow-ups from ${brandName}. If you ever want details on ${offer} again, just message back.`;
    case 'purchase_intent':
      return `Perfect — you sound ready. The fastest next step is here: ${joinLink}. If you want, I can also answer any final questions before you start.`;
    case 'objection':
      return `Totally fair. Most people ask that before moving forward. The reason clients choose ${brandName} is that ${offer} is structured to be practical, measurable, and low-friction to start. Want me to break down cost, timeline, or expected outcome?`;
    default:
      return `Thanks for reaching out. Based on what you’ve said about "${message}", ${brandName} can help with ${offer}. If you want, I can outline how it works, expected results, and the best next step.`;
  }
}

export async function generateReply(leadProfile = {}, message = '', brandConfig = {}) {
  const intent = detectIntent(message);
  const suggestedTags = tagsForIntent(intent);

  if (!openai) {
    return {
      reply: buildMockReply(intent, message, brandConfig),
      intent,
      suggestedTags,
      demoMode: true,
    };
  }

  const systemPrompt = `You are a sales conversation assistant inside GoHighLevel.
Reply in the brand's voice, keep responses concise, natural, commercially useful, and channel-appropriate.
Detected intent: ${intent}.
Brand config: ${JSON.stringify(brandConfig)}.
Lead profile: ${JSON.stringify(leadProfile)}.
Return a strong sales reply only.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
  });

  return {
    reply: completion.choices?.[0]?.message?.content?.trim() || buildMockReply(intent, message, brandConfig),
    intent,
    suggestedTags,
    demoMode: false,
  };
}
