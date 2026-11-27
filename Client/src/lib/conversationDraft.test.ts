import { expect, test } from "bun:test";
import { appendToDraft, messageLimit } from "./conversationDraft";

test("adding a prompt keeps learner text and respects the composer limit", () => {
  expect(appendToDraft("Hola", "Practiquemos.")).toBe("Hola\n\nPractiquemos.");
  expect(appendToDraft(" \n", "こんにちは")).toBe("こんにちは");
  expect(appendToDraft("あ".repeat(messageLimit - 3), "語")).toHaveLength(messageLimit);
  expect(appendToDraft("あ".repeat(messageLimit), "語")).toBeNull();
});
