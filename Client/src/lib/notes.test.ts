import { expect, test } from "bun:test";
import { matchesNote, noteExcerpt, readingWordNote } from "./notes";
import type { ReadingArticle } from "./reading";

test("note search handles accents, punctuation, Japanese, and legacy notes", () => {
  const note = { _id: "note", title: "Mañana", content: "また明日", language: "spanish" } as const;
  expect(matchesNote(note, " manana ")).toBe(true);
  expect(matchesNote(note, "明日")).toBe(true);
  expect(matchesNote(note, "[.*]")).toBe(false);
  expect(matchesNote({ ...note, tags: ["C++"] }, "C++")).toBe(true);
  expect(matchesNote({ ...note, topic: "Vocabulary" }, "manana vocabulary")).toBe(true);
  expect(matchesNote(note, "manana missing")).toBe(false);
  expect(matchesNote({ ...note, language: "japanese", content: "カフェ" }, "ｶﾌｪ")).toBe(true);
});

test("review previews keep the answer without repeating the derived title", () => {
  expect(noteExcerpt({ title: "Mañana", content: "Mañana\r\n\r\nTomorrow\r\nHasta mañana.", derivedTitle: true }))
    .toBe("Tomorrow\nHasta mañana.");
  expect(noteExcerpt({ title: "Mañana", content: "Mañana", derivedTitle: true })).toBe("");
  expect(noteExcerpt({ title: "喫茶店", content: "A coffee shop.\n\n駅の近くの喫茶店。" }))
    .toBe("A coffee shop.\n\n駅の近くの喫茶店。");
});

test("reading vocabulary retains context in a regular note payload", () => {
  const article = { _id: "507f1f77bcf86cd799439011", title: "Un paseo", language: "spanish" } as ReadingArticle;
  expect(readingWordNote(article, { word: "paseo", definition: "walk", contextSentence: "Vamos de paseo." })).toEqual({
    title: "paseo", content: "walk\n\nVamos de paseo.\n\nFrom Reading Desk: Un paseo",
    language: "spanish", topic: "Vocabulary", tags: ["Reading"], readingId: article._id,
  });
});
