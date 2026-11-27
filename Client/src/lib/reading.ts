import { request, type Language } from "./companion";

export type ReadingWord = {
  word: string;
  definition: string;
  pronunciation?: string;
  contextSentence?: string;
};

type ReadingQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

export type ReadingArticle = {
  _id: string;
  title: string;
  language: Language;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  contentType: "mini-stories" | "local-news" | "dialogue-reads" | "idioms-action" | "global-comparison";
  content: string;
  contentWithTranslations?: { originalText: string; translation: string; type: "sentence" | "paragraph" }[];
  preview: string;
  estimatedReadTime: number;
  vocabulary?: ReadingWord[];
  comprehensionQuestions?: ReadingQuestion[];
  culturalContext?: { country?: string; backgroundInfo?: string; culturalTips?: string[]; learningPoints?: string[] };
  grammarPoints?: { concept: string; explanation: string; examples: string[] }[];
};

export type ReadingProgress = {
  status: "not_started" | "reading" | "completed";
  timeSpent: number;
  quizScore?: number;
  completedAt?: string;
};

type ReadingItem = { article: ReadingArticle; progress: ReadingProgress };
export type ReadingShelf = {
  currentArticle: ReadingItem | null;
  completedArticles: ReadingItem[];
  totalCompleted: number;
};
export type ReadingResult = {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
};

export const readingNames = { spanish: "Spanish", japanese: "Japanese" } as const;
export const readingLocales = { spanish: "es", japanese: "ja" } as const;
export const readingFormats = {
  "mini-stories": "Short story",
  "local-news": "Local news",
  "dialogue-reads": "Dialogue",
  "idioms-action": "Idioms in use",
  "global-comparison": "Culture comparison",
} as const;

async function readingRequest<T>(path: string, token: string, signal: AbortSignal, method = "GET", body?: string): Promise<T> {
  return (await request(`/reading/${path}`, { method, signal, body }, token)).json();
}

export function loadReadingShelf(token: string, language: Language, signal: AbortSignal) {
  return readingRequest<ReadingShelf>(`articles/${language}`, token, signal);
}

export function assignReading(token: string, language: Language, hasCompleted: boolean, signal: AbortSignal) {
  return hasCompleted
    ? readingRequest<ReadingItem>(`next/${language}`, token, signal, "POST")
    : readingRequest<ReadingItem>(`current/${language}`, token, signal);
}

export function loadReading(token: string, articleId: string, signal: AbortSignal) {
  return readingRequest<{ article: ReadingArticle; progress: ReadingProgress | null }>(`article/${articleId}`, token, signal);
}

export async function startReading(token: string, articleId: string, signal: AbortSignal) {
  return (await readingRequest<{ progress: ReadingProgress }>(`start/${articleId}`, token, signal, "POST")).progress;
}

export async function completeReading(token: string, articleId: string, answers: number[], timeSpent: number, signal: AbortSignal) {
  return (await readingRequest<{ results: ReadingResult }>(
    `complete/${articleId}`, token, signal, "POST", JSON.stringify({ answers, timeSpent }),
  )).results;
}

export function readingPassages(article: Pick<ReadingArticle, "content" | "contentWithTranslations">) {
  const passages = article.content.normalize("NFC").split(/\r?\n[^\S\r\n]*\r?\n/)
    .map(text => text.trim()).filter(Boolean).map(text => ({ text, translations: [] as string[] }));
  const additionalEnglish: string[] = [];
  let paragraph = 0;
  let offset = 0;
  for (const segment of article.contentWithTranslations ?? []) {
    const original = segment.originalText.trim().normalize("NFC");
    const english = segment.translation.trim();
    let matched = false;
    if (original) {
      for (let index = paragraph; index < passages.length; index++) {
        const passage = passages[index]!;
        const start = passage.text.indexOf(original, index === paragraph ? offset : 0);
        if (start < 0) continue;
        if (english) passage.translations.push(english);
        paragraph = index;
        offset = start + original.length;
        matched = true;
        break;
      }
    }
    if (!matched && english) additionalEnglish.push(english);
  }
  return { passages, additionalEnglish };
}

export function readingDiscussionPrompt(article: Pick<ReadingArticle, "title" | "language" | "vocabulary">) {
  const word = article.vocabulary?.find(entry => entry.word.trim())?.word.trim().slice(0, 60);
  return `I just read “${article.title.slice(0, 160)}”. Ask me one simple question about it in ${readingNames[article.language]}.${word ? ` Help me use “${word}” in my answer.` : ""}`;
}

export function readingWordParts(text: string, vocabulary: ReadingWord[], language: Language) {
  const byWord = new Map<string, ReadingWord>();
  for (const entry of vocabulary) {
    const word = entry.word.trim().normalize("NFC").toLowerCase();
    if (word && !byWord.has(word)) byWord.set(word, entry);
  }
  const alternatives = [...byWord.keys()].sort((a, b) => b.length - a.length)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (!alternatives) return [{ text }];
  const pattern = language === "japanese" ? alternatives
    : `(?<![\\p{L}\\p{M}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{M}\\p{N}])`;
  const match = new RegExp(pattern, "giu");
  const parts: { text: string; entry?: ReadingWord }[] = [];
  let offset = 0;
  for (const hit of text.matchAll(match)) {
    if (hit.index > offset) parts.push({ text: text.slice(offset, hit.index) });
    parts.push({ text: hit[0], entry: byWord.get(hit[0].toLowerCase()) });
    offset = hit.index + hit[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}
