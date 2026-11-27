import { expect, test } from "bun:test";
import { readingDiscussionPrompt, readingPassages, readingWordParts } from "./reading";

test("the reader keeps the full source when an article has partial or unmatched translations", () => {
  expect(readingPassages({
    content: "Hola. Buenos días.\n\nEl mercado está abierto.",
    contentWithTranslations: [
      { originalText: "Hola", translation: "Hello.", type: "sentence" },
      { originalText: "El mercado está abierto.", translation: "The market is open.", type: "sentence" },
      { originalText: "Bienvenido", translation: "Welcome.", type: "sentence" },
    ],
  })).toEqual({
    passages: [
      { text: "Hola. Buenos días.", translations: ["Hello."] },
      { text: "El mercado está abierto.", translations: ["The market is open."] },
    ],
    additionalEnglish: ["Welcome."],
  });
});

test("sentence translations stay grouped with their original paragraphs and repeated sentences keep their order", () => {
  const content = "おはよう。雨ですね。\n窓を開けます。\r\n  \r\nおはよう。";
  expect(readingPassages({
    content,
    contentWithTranslations: [
      { originalText: "おはよう。", translation: "Good morning.", type: "sentence" },
      { originalText: "雨ですね。", translation: "It's raining.", type: "sentence" },
      { originalText: "おはよう。", translation: "Morning again.", type: "sentence" },
    ],
  }).passages).toEqual([
    { text: "おはよう。雨ですね。\n窓を開けます。", translations: ["Good morning.", "It's raining."] },
    { text: "おはよう。", translations: ["Morning again."] },
  ]);
});

test("the discussion draft carries the reading title, language, and a glossary word when available", () => {
  expect(readingDiscussionPrompt({ title: "Morning in Kyoto", language: "japanese", vocabulary: [{ word: " お茶 ", definition: "tea" }] }))
    .toBe("I just read “Morning in Kyoto”. Ask me one simple question about it in Japanese. Help me use “お茶” in my answer.");
  expect(readingDiscussionPrompt({ title: "In the Market", language: "spanish" }))
    .toBe("I just read “In the Market”. Ask me one simple question about it in Spanish.");
});

test("Spanish glossary words match case-insensitively without matching inside another word", () => {
  const cafe = { word: "café", definition: "coffee" };
  const text = "Café, cafetería y cafeína.";
  const parts = readingWordParts(text, [cafe], "spanish");
  expect(parts.map(part => part.text).join("")).toBe(text);
  expect(parts.filter(part => "entry" in part).map(part => part.text)).toEqual(["Café"]);
});

test("Japanese glossary matching prefers the longest phrase in text without spaces", () => {
  const entry = { word: "お茶", definition: "tea" };
  const text = "お茶を飲みます。";
  const parts = readingWordParts(text, [entry, { word: "茶", definition: "tea" }], "japanese");
  expect(parts).toEqual([{ text: "お茶", entry }, { text: "を飲みます。" }]);
});
