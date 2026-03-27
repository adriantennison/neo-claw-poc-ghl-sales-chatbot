import axios from 'axios';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function looksLikeAudio(url = '', mimeType = '') {
  const target = `${url} ${mimeType}`.toLowerCase();
  return /(audio|mp3|wav|m4a|ogg|mpeg|voice)/.test(target);
}

export function extractAudioAttachment(attachments = []) {
  return attachments.find((attachment) =>
    looksLikeAudio(attachment?.url || attachment?.link || '', attachment?.mimeType || attachment?.type || '')
  );
}

async function downloadToTempFile(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const ext = path.extname(new URL(url).pathname || '') || '.mp3';
  const filePath = path.join(os.tmpdir(), `ghl-audio-${crypto.randomUUID()}${ext}`);
  await fs.writeFile(filePath, Buffer.from(response.data));
  return filePath;
}

export async function transcribeAudioFromAttachment(attachment) {
  if (!attachment?.url && !attachment?.link) {
    return { transcript: null, demoMode: true, reason: 'No audio attachment URL found' };
  }

  const url = attachment.url || attachment.link;

  if (!openai) {
    return {
      transcript: '[Demo transcription] Customer sent a voice note asking for pricing and next steps.',
      demoMode: true,
      sourceUrl: url,
    };
  }

  const tempFile = await downloadToTempFile(url);
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: await fs.open(tempFile, 'r').then((f) => f.createReadStream()),
      model: 'gpt-4o-mini-transcribe',
    });

    return {
      transcript: transcription.text,
      demoMode: false,
      sourceUrl: url,
    };
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}
