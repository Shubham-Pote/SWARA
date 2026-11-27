import type { AudioChunk } from "./companion";

export function alignedCharacter(alignment: NonNullable<AudioChunk["alignment"]>, seconds: number) {
  const index = alignment.endSeconds.findIndex(end => seconds < end);
  return index >= 0 && seconds >= (alignment.startSeconds[index] ?? Infinity)
    ? alignment.characters[index] ?? "" : "";
}

export function createPlayback() {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  analyser.connect(context.destination);
  const samples = new Float32Array(analyser.fftSize);
  const sources = new Set<AudioBufferSourceNode>();
  let start = 0;
  let end = 0;
  let sequence = 0;
  const timings = new Map<AudioBufferSourceNode, { start: number; alignment: NonNullable<AudioChunk["alignment"]> }>();

  return {
    ready: context.resume(),
    enqueue(chunk: AudioChunk) {
      if (chunk.sequence !== sequence || typeof chunk.audio !== "string") throw new Error("Unexpected audio chunk");
      const bytes = Uint8Array.from(atob(chunk.audio), character => character.charCodeAt(0));
      if (!bytes.length || bytes.length % 2) throw new Error("Invalid audio samples");
      sequence++;
      const view = new DataView(bytes.buffer);
      const buffer = context.createBuffer(1, bytes.length / 2, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      sources.add(source);
      source.onended = () => { sources.delete(source); timings.delete(source); source.disconnect(); };
      const now = context.currentTime;
      if (end <= now) start = end = now + 0.055;
      if (chunk.alignment) timings.set(source, { start: end, alignment: chunk.alignment });
      source.start(end);
      end += buffer.duration;
    },
    active: () => sources.size > 0,
    playing: () => sources.size > 0 && context.state === "running" && context.currentTime >= start && context.currentTime < end,
    letter() {
      for (const { start, alignment } of timings.values()) {
        const character = alignedCharacter(alignment, context.currentTime - start);
        if (character) return character;
      }
      return "";
    },
    level() {
      analyser.getFloatTimeDomainData(samples);
      return Math.min(1, Math.sqrt(samples.reduce((total, sample) => total + sample * sample, 0) / samples.length) * 6);
    },
    close() {
      for (const source of sources) { source.onended = null; source.stop(); source.disconnect(); }
      sources.clear();
      timings.clear();
      void context.close().catch(() => {});
    }
  };
}

type Recognition = EventTarget & {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export function speechRecognition() {
  const browser = window as Window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Recognizer = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  return Recognizer ? new Recognizer() : null;
}
