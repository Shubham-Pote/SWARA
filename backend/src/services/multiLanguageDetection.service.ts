// ALL language detection
import { RomajiService } from "./romaji.service";
import { SpanishSlangService } from "./spanishSlang.service";

const romaji = new RomajiService();
const slang = new SpanishSlangService();

interface LanguageDetection {
  language: string;
  confidence: number;
  script?: string;
  normalized?: string;
}

// Dynamic import for franc-min (ES Module)
let francModule: any = null;
async function getFranc() {
  if (!francModule) {
    francModule = await import('franc-min');
  }
  return francModule.franc;
}

export class MultiLanguageDetectionService {
  /**
   * Returns language detection results with confidence scores
   */
  async detectLanguages(text: string): Promise<LanguageDetection[]> {
    const results: LanguageDetection[] = [];
    
    try {
      // 1. Check for Japanese romaji
      const romajiConv = romaji.convertIfRomaji(text);
      if (romajiConv) {
        results.push({
          language: 'japanese',
          confidence: 0.9,
          script: 'romaji',
          normalized: romajiConv
        });
        return results;
      }

      // 2. Check for Japanese characters (hiragana, katakana, kanji)
      const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
      if (hasJapanese) {
        results.push({
          language: 'japanese',
          confidence: 0.95,
          script: 'native'
        });
      }

      // 3. Check for Spanish slang and normalize
      const normalizedSlang = slang.normalise(text);
      if (normalizedSlang.changed) {
        results.push({
          language: 'spanish',
          confidence: 0.8,
          normalized: normalizedSlang.text
        });
        return results;
      }

      // 4. Use franc for general language detection
      const franc = await getFranc();
      const detectedLang = franc(text, { minLength: 3 });
      let language = 'english';
      let confidence = 0.6;

      switch (detectedLang) {
        case 'spa':
          language = 'spanish';
          confidence = 0.8;
          break;
        case 'jpn':
          language = 'japanese';
          confidence = 0.8;
          break;
        case 'eng':
          language = 'english';
          confidence = 0.8;
          break;
        default:
          // Default to English for undetected languages
          language = 'english';
          confidence = 0.5;
      }

      if (!hasJapanese) { // Don't duplicate Japanese detection
        results.push({
          language,
          confidence
        });
      }

      // 5. Check for mixed language content
      const words = text.toLowerCase().split(/\s+/);
      const spanishWords = ['hola', 'gracias', 'como', 'que', 'si', 'no', 'muy', 'bien'];
      const japaneseRomaji = ['arigatou', 'konnichiwa', 'sayonara', 'sumimasen', 'hai'];
      
      const spanishCount = words.filter(word => spanishWords.some(sw => word.includes(sw))).length;
      const japaneseRomajiCount = words.filter(word => japaneseRomaji.some(jr => word.includes(jr))).length;
      
      if (spanishCount > 0 && !results.some(r => r.language === 'spanish')) {
        results.push({
          language: 'spanish',
          confidence: Math.min(0.7, spanishCount / words.length)
        });
      }
      
      if (japaneseRomajiCount > 0 && !results.some(r => r.language === 'japanese')) {
        results.push({
          language: 'japanese',
          confidence: Math.min(0.7, japaneseRomajiCount / words.length),
          script: 'romaji'
        });
      }

      return results.length > 0 ? results : [{
        language: 'english',
        confidence: 0.5
      }];

    } catch (error) {
      console.error('Error detecting languages:', error);
      return [{
        language: 'english',
        confidence: 0.3
      }];
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async detect(text: string) {
    // 1. Romaji → Hiragana/Katakana
    const romajiConv = romaji.convertIfRomaji(text);
    if (romajiConv) return { language: "ja", normalized: romajiConv };

    // 2. Spanish slang normalisation
    const normalizedSlang = slang.normalise(text);
    if (normalizedSlang.changed) return { language: "es", normalized: normalizedSlang.text };

    // 3. Generic detection fallback
    const franc = await getFranc();
    const lang = franc(text, { minLength: 3 });
    return { language: lang === "jpn" ? "ja" : lang === "spa" ? "es" : "en", normalized: text };
  }

  /**
   * Check if text contains mixed languages
   */
  async isMixedLanguage(text: string): Promise<boolean> {
    const detections = await this.detectLanguages(text);
    return detections.length > 1;
  }

  /**
   * Get primary language from multiple detections
   */
  getPrimaryLanguage(detections: LanguageDetection[]): LanguageDetection {
    if (detections.length === 0) {
      return { language: 'english', confidence: 0.5 };
    }
    
    return detections.reduce((primary, current) => 
      current.confidence > primary.confidence ? current : primary
    );
  }
}
