import { expect, test } from "bun:test";
import { pageAt, pagePaths, readingArticleAt, readingPath, roomFor, validReadingId } from "./navigation";

test("dashboard, picker, and character rooms have distinct deep links", () => {
  expect(pageAt("/")).toBe("dashboard");
  expect(pageAt("/companion/")).toBe("companion");
  expect(roomFor(pageAt(pagePaths.spanish))).toBe("spanish");
  expect(roomFor(pageAt(pagePaths.japanese + "/"))).toBe("japanese");
});

test("reading links distinguish the desk from an article, including invalid links", () => {
  const articleId = "61f0717d1fa9df03ec708122";
  expect(pageAt("/reading")).toBe("reading");
  expect(readingArticleAt("/reading")).toBeNull();
  expect(pageAt(readingPath(articleId))).toBe("reading");
  expect(readingArticleAt(readingPath(articleId) + "/")).toBe(articleId);
  expect(validReadingId(articleId)).toBe(true);
  expect(validReadingId("missing")).toBe(false);
  expect(pageAt("/reading/missing")).toBe("reading");
  expect(roomFor(pageAt(readingPath(articleId)))).toBeNull();
});

test("the notebook is a standalone deep link", () => {
  expect(pageAt("/notes/")).toBe("notes");
  expect(roomFor(pageAt(pagePaths.notes))).toBeNull();
});

test("unknown paths can recover without loading a dashboard under a broken URL", () => {
  expect(pageAt("/companion/nobody")).toBe("not-found");
  expect(pageAt("/reading/one/two")).toBe("not-found");
  expect(roomFor(pageAt("/elsewhere"))).toBeNull();
});
