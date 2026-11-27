import { z } from 'zod';

const profiles = {
  spanish: { voiceEnv: 'ELEVENLABS_MARIA_VOICE_ID', code: 'es', stability: 0.42, speed: 1 },
  japanese: { voiceEnv: 'ELEVENLABS_AKIRA_VOICE_ID', code: 'ja', stability: 0.6, speed: 0.94 }
} as const;

type Language = keyof typeof profiles;

const alignment = z.object({
  characters: z.array(z.string()),
  character_start_times_seconds: z.array(z.number().finite().nonnegative()),
  character_end_times_seconds: z.array(z.number().finite().nonnegative())
});
const speechChunk = z.object({
  audio_base64: z.string(),
  alignment: alignment.nullish(),
  normalized_alignment: alignment.nullish()
});

export function companionVoice(language: Language) {
  const profile = profiles[language];
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env[profile.voiceEnv]?.trim();
  if (key && voiceId && /^[a-zA-Z0-9]+$/.test(voiceId)) return { ...profile, key, voiceId };
}

export async function* streamCompanionSpeech(
  voice: NonNullable<ReturnType<typeof companionVoice>>, text: string, english: boolean,
  imitate: boolean, signal: AbortSignal, previousText?: string
) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}/stream/with-timestamps?output_format=pcm_24000`, {
    method: 'POST',
    headers: { 'xi-api-key': voice.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text, model_id: 'eleven_flash_v2_5', language_code: english ? 'en' : voice.code,
      previous_text: previousText,
      voice_settings: { stability: voice.stability, similarity_boost: 0.75, speed: imitate ? 0.85 : voice.speed }
    }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)])
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`ElevenLabs speech failed with HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split('\n');
      pending = done ? '' : (lines.pop() ?? '');
      if (pending.length > 1024 * 1024) throw new Error('ElevenLabs speech chunk exceeded the size limit');
      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.length > 1024 * 1024) throw new Error('ElevenLabs speech chunk exceeded the size limit');
        const chunk = speechChunk.parse(JSON.parse(line));
        if (!chunk.audio_base64) continue;
        const timing = chunk.normalized_alignment ?? chunk.alignment;
        yield { audio: chunk.audio_base64, alignment: timing ? {
          characters: timing.characters,
          startSeconds: timing.character_start_times_seconds,
          endSeconds: timing.character_end_times_seconds
        } : null };
      }
      if (done) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
