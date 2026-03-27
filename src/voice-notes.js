import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public', 'voice-notes');

export async function generateVoiceNote(text, voiceId = process.env.ELEVENLABS_VOICE_ID) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey || !voiceId) {
    console.log('[VOICE DEMO] ElevenLabs not configured. Returning null buffer.');
    return null;
  }

  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.75,
      },
    },
    {
      responseType: 'arraybuffer',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
    }
  );

  return Buffer.from(response.data);
}

export async function serveVoiceNote(text, voiceId = process.env.ELEVENLABS_VOICE_ID) {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const audioBuffer = await generateVoiceNote(text, voiceId);
  const fileName = `${Date.now()}-${crypto.randomUUID()}.mp3`;
  const filePath = path.join(PUBLIC_DIR, fileName);

  if (audioBuffer) {
    await fs.writeFile(filePath, audioBuffer);
    return { url: `/voice-notes/${fileName}`, demoMode: false };
  }

  const placeholder = `Voice note unavailable in demo mode.\n\nRequested text:\n${text}\n`;
  const fallbackName = fileName.replace(/\.mp3$/, '.txt');
  const fallbackPath = path.join(PUBLIC_DIR, fallbackName);
  await fs.writeFile(fallbackPath, placeholder, 'utf8');
  return { url: `/voice-notes/${fallbackName}`, demoMode: true };
}
