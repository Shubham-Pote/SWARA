import { request, type Language } from "./companion";
import type { Note } from "./notes";

export type Writing = { title: string; content: string; topic: Note["topic"] | ""; tags: string[] };
export type Pending = Writing & { writeId: string; revision: number };
export type Draft = Writing & { id: string; revision: number; updatedAt: string; pending?: Pending };

export const newPageId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 24);
export const pageTitle = (writing: Writing) =>
  writing.title.trim() ||
  writing.content.trimStart().split(/\r?\n/, 1)[0]?.trim().slice(0, 200) ||
  "Untitled note";
export const draftPrefix = (account: string, language: Language) => `swara.notebook:${account}:${language}:`;
export function fromNote(note?: Note): Draft {
  return {
    id: note?._id ?? newPageId(),
    title: note?.derivedTitle ? "" : (note?.title ?? ""),
    content: note?.content ?? "",
    tags: note?.tags ?? [],
    topic: note?.topic ?? "",
    revision: note ? (note.revision ?? 0) : -1,
    updatedAt: note?.updatedAt ?? new Date().toISOString(),
  };
}
export function recoverDrafts(prefix: string): Draft[] {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .flatMap((key) => {
      try {
        const item = JSON.parse(localStorage.getItem(key) ?? "null");
        return item &&
          key === prefix + item.id &&
          typeof item.content === "string" &&
          typeof item.title === "string" &&
          Array.isArray(item.tags) &&
          Number.isInteger(item.revision)
          ? [item as Draft]
          : [];
      } catch {
        return [];
      }
    });
}
export async function saveWriting(
  token: string,
  language: Language,
  id: string,
  pending: Pending,
  signal: AbortSignal,
): Promise<Note> {
  const response = await request(
    `/notes/${id}`,
    { method: "PATCH", signal, keepalive: true, body: JSON.stringify({ ...pending, topic: pending.topic || null, language }) },
    token,
  );
  return (await response.json()).note;
}
