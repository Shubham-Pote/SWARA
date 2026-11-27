import { expect, test } from "bun:test";
import { alignedCharacter } from "./companionAudio";
import { readEvents } from "./companion";
import { replyLines } from "./replyWords";

function wire(...parts: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({ start(controller) {
    for (const part of parts) controller.enqueue(part);
    controller.close();
  } });
}

test("parses fragmented SSE, including a split UTF-8 character, through done", async () => {
  const encoder = new TextEncoder();
  const first = encoder.encode('event: text\r\ndata: "¡Hola!"\r\n\r\n');
  const cut = first.indexOf(0xc2) + 1;
  const events = [];
  const body = wire(first.slice(0, cut), first.slice(cut, -3), first.slice(-3),
    encoder.encode('event: performance\ndata: {"phase":"idle","cue":"rest"}\n\nevent: done\ndata: ""\n\n'));
  for await (const event of readEvents(body)) events.push(event);
  expect(events).toEqual([{ name: "text", value: "¡Hola!" }, { name: "performance", value: { phase: "idle", cue: "rest" } }]);
});

test("rejects a stream that closes before the backend confirms the turn", async () => {
  const body = wire(new TextEncoder().encode('event: text\ndata: "Partial reply"\n\n'));
  const read = readEvents(body);
  expect((await read.next()).value?.value).toBe("Partial reply");
  await expect(read.next()).rejects.toThrow("interrupted");
});

test("selects the aligned mouth sound only during its scheduled interval", () => {
  const timing = { characters: ["í", "お"], startSeconds: [0, 0.4], endSeconds: [0.2, 0.6] };
  expect([-1, 0, 0.2, 0.4, 0.6].map(time => alignedCharacter(timing, time))).toEqual(["", "í", "", "お", ""]);
});

test("reveals full words across SSE chunks without displaying split language labels", () => {
  const parts = ["Eng", "lish: Try this to", "day.\nSpa", "nish: ¡Buenos ", "días!"];
  const words = (text: string, complete = false) =>
    replyLines(text, "es-MX", complete).flatMap(line => line?.words ?? []);
  expect(parts.map((_, index) => words(parts.slice(0, index + 1).join("")))).toEqual([
    [], ["Try ", "this "], ["Try ", "this ", "today."],
    ["Try ", "this ", "today.", "¡Buenos "], ["Try ", "this ", "today.", "¡Buenos "],
  ]);
  expect(words(parts.join(""), true).at(-1)).toBe("días!");
});

test("segments Japanese words and retains language and pronunciation", () => {
  expect(replyLines("Japanese: 私は日本語。\nPronunciation: Nihongo", "ja-JP", false)).toEqual([
    { words: ["私", "は", "日本語。"], lang: "ja-JP", pronunciation: false },
    { words: [], lang: undefined, pronunciation: true },
  ]);
  expect(replyLines("Pronunciation: Nihongo", "ja-JP", true)[0]?.words).toEqual(["Nihongo"]);
});
