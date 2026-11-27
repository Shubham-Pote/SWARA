import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateGeminiJson(
  prompt: string,
  modelName = 'gemini-3.5-flash-lite',
  signal?: AbortSignal
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' }
  });
  const { response } = await model.generateContent(prompt, signal ? { signal } : undefined);
  const text = response.text();
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}
