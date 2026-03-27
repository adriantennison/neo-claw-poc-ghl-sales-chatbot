import crypto from 'crypto';

export function verifyGhlWebhookSignature(rawBody, signature, secret = process.env.GHL_WEBHOOK_SECRET) {
  if (!secret) {
    return { enabled: false, valid: true, reason: 'No GHL_WEBHOOK_SECRET configured' };
  }

  if (!signature) {
    return { enabled: true, valid: false, reason: 'Missing webhook signature header' };
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalizedIncoming = String(signature).replace(/^sha256=/, '').trim();

  const valid =
    normalizedIncoming.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(normalizedIncoming), Buffer.from(expected));

  return {
    enabled: true,
    valid,
    reason: valid ? 'Signature valid' : 'Signature mismatch',
    expectedSample: expected.slice(0, 8),
  };
}
