// Japanese romaji conversion
import wanakana from "wanakana";

export class RomajiService {
  /**
   * If the entire string is recognised romaji, returns its Hiragana.
   * Otherwise returns empty string.
   */
  convertIfRomaji(text: string): string | "" {
    if (wanakana.isRomaji(text.replace(/\s+/g, ""))) {
      return wanakana.toHiragana(text);
    }
    return "";
  }

  /**
   * Converts Japanese text (hiragana, katakana, kanji) to romaji
   * @param text Japanese text to convert
   * @returns Romanized version of the text
   */
  toRomaji(text: string): string {
    return wanakana.toRomaji(text);
  }

  /**
   * Checks if text contains Japanese characters
   * @param text Text to check
   * @returns True if text contains Japanese characters
   */
  isJapanese(text: string): boolean {
    return wanakana.isJapanese(text);
  }
}
