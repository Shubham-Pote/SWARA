// Learning translations with character-specific integration
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  explanation?: string;
  grammarNotes?: string[];
  culturalContext?: string;
  confidence: number;
  characterResponse?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface CharacterTranslationContext {
  characterId: 'maria' | 'akira';
  learningLevel: string;
  previousMistakes?: string[];
  focusAreas?: string[];
}

export class TranslationService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  private characterPatterns = {
    maria: {
      enthusiasmLevel: 'high',
      teachingStyle: 'warm and encouraging',
      culturalFocus: 'Mexican Spanish and Latin American culture',
      commonPhrases: ['¡Qué bueno!', '¡Excelente!', '¡No te preocupes!', 'Vamos a practicar'],
      specialties: ['Mexican slang', 'emotion expressions', 'family terminology', 'food culture']
    },
    akira: {
      enthusiasmLevel: 'calm',
      teachingStyle: 'patient and respectful',
      culturalFocus: 'Japanese culture and proper etiquette',
      commonPhrases: ['がんばって', 'そうですね', 'だいじょうぶです', '一緒に学びましょう'],
      specialties: ['politeness levels', 'kanji meanings', 'cultural context', 'proper grammar']
    }
  };

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for TranslationService');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async translateWithCharacter(
    text: string,
    characterId: 'maria' | 'akira',
    learningLevel: string = 'beginner'
  ): Promise<TranslationResult> {
    const targetLanguage = characterId === 'maria' ? 'spanish' : 'japanese';
    const sourceLanguage = this.detectSourceLanguage(text);
    
    try {
      const character = this.characterPatterns[characterId];
      const prompt = `Translate "${text}" from ${sourceLanguage} to ${targetLanguage}. Character: ${characterId === 'maria' ? 'María, warm Mexican Spanish teacher' : 'Akira, respectful Japanese teacher'}. Return JSON: {"translatedText": "", "explanation": "", "grammarNotes": [], "culturalContext": "", "confidence": 0.9, "difficulty": "beginner", "characterResponse": ""}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const parsed = JSON.parse(response);
        return {
          translatedText: parsed.translatedText || text,
          sourceLanguage,
          targetLanguage,
          explanation: parsed.explanation,
          grammarNotes: parsed.grammarNotes || [],
          culturalContext: parsed.culturalContext,
          confidence: parsed.confidence || 0.8,
          characterResponse: parsed.characterResponse,
          difficulty: parsed.difficulty || 'intermediate'
        };
      } catch (parseError) {
        return {
          translatedText: text,
          sourceLanguage,
          targetLanguage,
          confidence: 0.3
        };
      }
    } catch (error) {
      console.error('Error translating text:', error);
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 0.1
      };
    }
  }

  private detectSourceLanguage(text: string): string {
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
      return 'japanese';
    }
    if (/[ñáéíóúü¿¡]/.test(text.toLowerCase())) {
      return 'spanish';
    }
    return 'english';
  }

  async explainGrammar(text: string, language: string, characterId?: 'maria' | 'akira'): Promise<string[]> {
    try {
      const characterPrompt = characterId ? 
        `Explain as ${characterId === 'maria' ? 'María' : 'Akira'}: ` : '';
      
      const prompt = characterPrompt + `Explain grammar in "${text}" for ${language} learners. Return JSON array: ["explanation1", "explanation2"]`;
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      try {
        const explanations = JSON.parse(response);
        return Array.isArray(explanations) ? explanations : [];
      } catch (parseError) {
        return [];
      }
    } catch (error) {
      console.error('Error explaining grammar:', error);
      return [];
    }
  }
}
