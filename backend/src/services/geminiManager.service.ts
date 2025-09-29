// Enhanced Gemini streaming & fallback
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const MODEL_PRIMARY = "gemini-2.0-flash";  // Fix: Use correct model name
const MODEL_FALLBACK = "gemini-pro"; // Same as existing backend
const MAX_RETRIES = 3;
const CHUNK_DELIMITER = /(?<=[.!?])\s+/;             // sentence boundary

export class GeminiManager {
  private primary: GenerativeModel;
  private fallback: GenerativeModel;

  constructor() {
    // Use existing Gemini API pattern (string parameter)
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    this.primary = gemini.getGenerativeModel({ model: MODEL_PRIMARY });
    this.fallback = gemini.getGenerativeModel({ model: MODEL_FALLBACK });
  }

  /**
   * Returns { stream, fullTextPromise }.
   * – stream  → async iterator yielding **sentences**  
   * – fullTextPromise → resolves to the concatenated reply
   */
  chatStream(
    messages: { role: "user" | "assistant"; content: string }[]
  ) {
    // Convert messages to Gemini API format (matching existing backend pattern)
    const prompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

    // Wrap core call in fallback logic.
    const call = async () => {
      try {
        return await this.primary.generateContentStream(prompt);
      } catch {
        return await this.fallback.generateContentStream(prompt);
      }
    };

    const streamPromise = this.retryCall(call, MAX_RETRIES);

    // Create an async generator that splits by sentence.
    const stream = (async function* () {
      const res = await streamPromise;
      let buffer = "";

      for await (const chunk of res.stream) {
        buffer += chunk.text();
        for (;;) {
          const match = buffer.match(CHUNK_DELIMITER);
          if (!match) break;

          const idx = match.index! + match[0].length;
          const sentence = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx);
          if (sentence) yield sentence;
        }
      }

      if (buffer.trim()) yield buffer.trim(); // flush remainder
    })();

    // Collect full text in background
    const fullTextPromise = (async () => {
      let full = "";
      for await (const part of stream) full += part + " ";
      return full.trim();
    })();

    return { stream, fullTextPromise };
  }

  private async retryCall<T>(fn: () => Promise<T>, retries: number): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
