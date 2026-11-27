const labels = ["english:", "spanish:", "japanese:", "pronunciation:"];
const japaneseWords = new Intl.Segmenter("ja", { granularity: "word" });

export function replyLines(text: string, locale: string, complete: boolean) {
  const lines = text.split(/\r?\n/);
  return lines.map((line, index) => {
    const trimmed = line.trimStart();
    if (!trimmed || labels.some(label => label.startsWith(trimmed.toLowerCase()))) return null;
    const label = /^(English|Spanish|Japanese|Pronunciation):\s*/i.exec(trimmed);
    const kind = label?.[1]?.toLowerCase();
    const content = trimmed.slice(label?.[0].length ?? 0);
    const pronunciation = kind === "pronunciation";
    const lang = kind === "english" ? "en" : kind && !pronunciation ? locale : undefined;
    const words: string[] = [];
    if (kind === "japanese" || (!kind && locale.startsWith("ja"))) {
      for (const { segment, isWordLike } of japaneseWords.segment(content)) {
        if (isWordLike || !words.length) words.push(segment);
        else words[words.length - 1] += segment;
      }
    } else {
      words.push(...(content.match(/\S+\s*/g) ?? []));
    }
    // A provider delta can end inside a word.
    if (!complete && index === lines.length - 1 && !/\s$/.test(content)) words.pop();
    return { words, pronunciation, lang };
  });
}
