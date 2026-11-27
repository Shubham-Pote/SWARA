import { request, type Language } from "./companion";
import type { ReadingArticle, ReadingWord } from "./reading";

export const noteTopics = ["Vocabulary", "Grammar", "Pronunciation", "Culture", "Beginner", "Intermediate", "Advanced"] as const;
export const noteLimits = { title: 200, content: 10_000 };

type NoteTopic = typeof noteTopics[number];
type NoteInput = { title: string; content: string; language: Language; topic?: NoteTopic; tags: string[]; readingId?: string };
export type Note = Omit<NoteInput, "tags"> & {
  _id: string;
  tags?: string[];
  starred?: boolean;
  aiGenerated?: boolean;
  lessonId?: { title: string } | null;
  createdAt?: string;
  updatedAt?: string;
  derivedTitle?: boolean;
  revision?: number;
};

export function readingWordNote(article: ReadingArticle, word: ReadingWord): NoteInput {
  return {
    title: word.word.slice(0, noteLimits.title),
    content: [word.definition, word.pronunciation && `Pronunciation: ${word.pronunciation}`,
      word.contextSentence, `From Reading Desk: ${article.title}`].filter(Boolean).join("\n\n").slice(0, noteLimits.content),
    language: article.language,
    ...(article._id && { readingId: article._id }),
    topic: "Vocabulary",
    tags: ["Reading"],
  };
}

export async function loadNotes(token: string, language: Language, signal: AbortSignal): Promise<{ notes: Note[] }> {
  return (await request(`/notes?language=${language}`, { signal }, token)).json();
}

export async function createNote(token: string, note: NoteInput, signal: AbortSignal): Promise<{ note: Note }> {
  return (await request("/notes", { method: "POST", body: JSON.stringify(note), signal }, token)).json();
}

export async function starNote(token: string, id: string, signal: AbortSignal): Promise<{ starred: boolean }> {
  return (await request(`/notes/${id}/star`, { method: "PUT", signal }, token)).json();
}

export async function deleteNote(token: string, id: string, signal: AbortSignal) {
  await request(`/notes/${id}`, { method: "DELETE", signal }, token);
}

export function matchesNote(note: Note, query: string) {
  const normalize = (text: string) => {
    const lower = text.toLowerCase();
    return note.language === "spanish" ? lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : lower.normalize("NFKC");
  };
  const terms = normalize(query).trim().split(/\s+/u);
  const fields = [note.title, note.content, note.topic ?? "", ...(note.tags ?? [])].map(normalize);
  return terms.every(term => fields.some(field => field.includes(term)));
}

export function noteExcerpt(note: Pick<Note, "title" | "content" | "derivedTitle">) {
  const [first, ...rest] = note.content.trimStart().split(/\r?\n/);
  return note.derivedTitle || first?.trim() === note.title ? rest.join("\n").trim() : note.content.trim();
}
