// Cultural learning integration with dynamic analysis
interface CulturalNote {
  text: string;
  type: 'grammar' | 'cultural' | 'pronunciation' | 'etiquette' | 'regional';
  confidence: number;
  characterSpecific?: boolean;
}

interface LanguageDetection {
  language: string;
  confidence: number;
  script?: string;
  normalized?: string;
}

export class CulturalContextService {
  private spanishCulturalPatterns = {
    greetings: {
      patterns: ['hola', 'buenos dias', 'buenas tardes', 'que tal'],
      notes: {
        'hola': 'In Mexico, "¡Hola!" is warm and enthusiastic - always with energy!',
        'que tal': '"¿Qué tal?" is casual Mexican Spanish - perfect for friends!',
        'buenos dias': 'Morning greetings show respect - very important in Mexican culture!'
      }
    },
    expressions: {
      patterns: ['que padre', 'no manches', 'orale', 'chevere', 'esta padrísimo'],
      notes: {
        'que padre': '"¡Qué padre!" is pure Mexican excitement - shows you\'re impressed!',
        'no manches': '"¡No manches!" expresses surprise - like "No way!" in English',
        'orale': '"¡Órale!" is uniquely Mexican - shows enthusiasm or surprise!'
      }
    },
    formality: {
      patterns: ['usted', 'señor', 'señora', 'don', 'doña'],
      notes: {
        'usted': 'Using "usted" shows respect - important in formal Mexican situations',
        'señor': 'Titles like "Señor" show cultural politeness and respect'
      }
    }
  };

  private japaneseCulturalPatterns = {
    politeness: {
      patterns: ['です', 'ます', 'ございます', 'さん', 'kun', 'chan'],
      notes: {
        'です': 'です (desu) makes sentences polite - essential for respectful Japanese',
        'ます': 'ます (masu) form shows respect and politeness in conversation',
        'さん': 'さん (-san) is the safe, respectful way to address someone'
      }
    },
    greetings: {
      patterns: ['こんにちは', 'おはよう', 'こんばんは', 'いらっしゃいませ'],
      notes: {
        'こんにちは': 'こんにちは (konnichiwa) - the standard respectful greeting',
        'おはよう': 'おはよう vs おはようございます - formality matters in Japanese!'
      }
    },
    cultural: {
      patterns: ['bow', 'thank', 'sorry', 'excuse'],
      notes: {
        'bow': 'Bowing is crucial in Japanese culture - even in language shows respect',
        'thank': 'Japanese has many levels of "thank you" - choose based on situation'
      }
    }
  };

  /**
   * Generate dynamic cultural notes based on message content and character
   */
  generateCulturalNote(
    originalText: string, 
    detectedLanguages: LanguageDetection[], 
    characterId: 'maria' | 'akira'
  ): CulturalNote | null {
    const text = originalText.toLowerCase();
    
    // Spanish cultural analysis
    if (detectedLanguages.some(lang => lang.language === 'spanish')) {
      return this.analyzeSpanishCulture(text, characterId);
    }
    
    // Japanese cultural analysis  
    if (detectedLanguages.some(lang => lang.language === 'japanese')) {
      return this.analyzeJapaneseCulture(text, originalText, characterId);
    }

    // Cross-cultural learning opportunities
    return this.findCrossCulturalMoments(text, characterId);
  }

  /**
   * Analyze Spanish text for cultural teaching moments
   */
  private analyzeSpanishCulture(text: string, characterId: string): CulturalNote | null {
    // Check greetings
    for (const [pattern, note] of Object.entries(this.spanishCulturalPatterns.greetings.notes)) {
      if (text.includes(pattern)) {
        return {
          text: note,
          type: 'cultural',
          confidence: 0.9,
          characterSpecific: characterId === 'maria'
        };
      }
    }

    // Check expressions
    for (const [pattern, note] of Object.entries(this.spanishCulturalPatterns.expressions.notes)) {
      if (text.includes(pattern)) {
        return {
          text: note,
          type: 'cultural', 
          confidence: 0.95,
          characterSpecific: characterId === 'maria'
        };
      }
    }

    // Check formality
    for (const [pattern, note] of Object.entries(this.spanishCulturalPatterns.formality.notes)) {
      if (text.includes(pattern)) {
        return {
          text: note,
          type: 'etiquette',
          confidence: 0.85,
          characterSpecific: characterId === 'maria'
        };
      }
    }

    // General Spanish cultural moment
    if (characterId === 'maria') {
      return {
        text: "¡Perfecto! You're learning Mexican Spanish - remember we're expressive and warm in our communication!",
        type: 'cultural',
        confidence: 0.6
      };
    }

    return null;
  }

  /**
   * Analyze Japanese text for cultural teaching moments
   */
  private analyzeJapaneseCulture(text: string, originalText: string, characterId: string): CulturalNote | null {
    // Check politeness patterns
    for (const [pattern, note] of Object.entries(this.japaneseCulturalPatterns.politeness.notes)) {
      if (text.includes(pattern) || originalText.includes(pattern)) {
        return {
          text: note,
          type: 'etiquette',
          confidence: 0.9,
          characterSpecific: characterId === 'akira'
        };
      }
    }

    // Check greetings
    for (const [pattern, note] of Object.entries(this.japaneseCulturalPatterns.greetings.notes)) {
      if (text.includes(pattern) || originalText.includes(pattern)) {
        return {
          text: note,
          type: 'cultural',
          confidence: 0.95,
          characterSpecific: characterId === 'akira'
        };
      }
    }

    // Check for missing politeness
    if (characterId === 'akira' && !originalText.includes('です') && !originalText.includes('ます')) {
      return {
        text: "Remember to add です (desu) or ます (masu) to show respect in Japanese conversation.",
        type: 'etiquette',
        confidence: 0.8,
        characterSpecific: true
      };
    }

    return null;
  }

  /**
   * Find cross-cultural learning opportunities
   */
  private findCrossCulturalMoments(text: string, characterId: string): CulturalNote | null {
    // Gratitude expressions
    if (text.includes('thank') || text.includes('gracias') || text.includes('arigatou')) {
      if (characterId === 'maria') {
        return {
          text: "Both Spanish and Japanese cultures value gratitude, but we express it differently - Spanish is more emotional!",
          type: 'cultural',
          confidence: 0.7
        };
      } else {
        return {
          text: "Gratitude is very important in Japanese culture - we have many levels from arigatou to arigatou gozaimasu.",
          type: 'cultural', 
          confidence: 0.7
        };
      }
    }

    // Respect and formality
    if (text.includes('respect') || text.includes('formal') || text.includes('polite')) {
      if (characterId === 'akira') {
        return {
          text: "Respect and hierarchy are fundamental in Japanese society - it shows in our language structure.",
          type: 'etiquette',
          confidence: 0.8
        };
      }
    }

    return null;
  }

  /**
   * Generate character-specific cultural teaching moment
   */
  generateCharacterCulturalMoment(characterId: 'maria' | 'akira', context?: string): CulturalNote {
    if (characterId === 'maria') {
      const moments = [
        "In Mexican culture, family comes first - that's why we're so warm with everyone!",
        "Mexican Spanish uses diminutives like '-ito' and '-ita' to show affection - very sweet!",
        "Food is love in Mexican culture - learning food vocabulary connects you to our heart!",
        "Mexican celebrations are colorful and loud - just like our language!"
      ];
      
      return {
        text: moments[Math.floor(Math.random() * moments.length)],
        type: 'cultural',
        confidence: 0.8,
        characterSpecific: true
      };
    } else {
      const moments = [
        "Japanese culture values harmony - that's why we avoid direct confrontation in language.",
        "Seasonal greetings are important in Japan - we connect language to nature's cycles.",
        "In Japan, silence can be as meaningful as words - respect the pauses in conversation.",
        "Japanese gift-giving has specific language - even saying 'thank you' has protocols!"
      ];
      
      return {
        text: moments[Math.floor(Math.random() * moments.length)],
        type: 'cultural', 
        confidence: 0.8,
        characterSpecific: true
      };
    }
  }

  // Legacy method for backward compatibility
  generateNote(original: string, lang: "es" | "ja") {
    if (lang === "es") {
      return "Tip: In Mexican Spanish, tone is expressive—add '¡' and '!' for enthusiasm.";
    }
    return "Tip: In Japanese, end sentences politely with です/ます to show respect.";
  }
}
