import { ILesson } from '../models/lesson';
import { generateGeminiJson } from './geminiJson.service';

function validateLessonContent(lesson: any, minSteps: number, maxSteps: number) {
  if (!Array.isArray(lesson.steps) || lesson.steps.length < minSteps || lesson.steps.length > maxSteps) {
    throw new Error(`Lesson must contain ${minSteps} to ${maxSteps} steps`);
  }

  let dialogueSteps = 0;
  let practiceSteps = 0;

  for (const [index, step] of lesson.steps.entries()) {
    if (step.type === 'dialogue') {
      dialogueSteps += 1;
      const dialogue = step.content?.dialogue;
      if (!Array.isArray(dialogue) || dialogue.length < 2 ||
          dialogue.some(exchange => !exchange?.speaker || !exchange.text || !exchange.translation)) {
        throw new Error(`Dialogue step ${index + 1} must have at least two complete exchanges`);
      }
    }

    if (step.type === 'practice') {
      practiceSteps += 1;
      const exercises = step.content?.exercises;
      if (!Array.isArray(exercises) || exercises.length < 2) {
        throw new Error(`Practice step ${index + 1} must have at least two exercises`);
      }

      for (const exercise of exercises) {
        if (!exercise?.question || !exercise.type) {
          throw new Error(`Practice step ${index + 1} has an incomplete exercise`);
        }
        if (exercise.type === 'multiple_choice' &&
            (!Array.isArray(exercise.options) || exercise.options.length < 3 ||
             !exercise.correctAnswer || !exercise.explanation)) {
          throw new Error(`Practice step ${index + 1} has an incomplete multiple-choice exercise`);
        }
        if (exercise.type === 'fill_in_the_blank' && (!exercise.answer || !exercise.explanation)) {
          throw new Error(`Practice step ${index + 1} has an incomplete fill-in-the-blank exercise`);
        }
      }
    }
  }

  if (!dialogueSteps || !practiceSteps) {
    throw new Error('Lesson must include dialogue and practice steps');
  }
}

export async function generateLessonContent(params: {
  language: 'spanish' | 'japanese';
  lessonType: string;
  difficulty: string;
  topic: string;
  generateAudio?: boolean;
}) {
  const { language, lessonType, difficulty, topic, generateAudio = false } = params;

  const minSteps = 6;
  const maxSteps = 10;

  const languageInstructions = {
      spanish: `Generate a comprehensive Spanish language lesson with rich, complete content:
- Include actual Spanish words with proper accent marks and authentic pronunciation
- Provide detailed cultural context from Spanish-speaking countries
- Create engaging dialogue conversations with real-world scenarios (minimum 3 exchanges per dialogue)
- Design meaningful practice exercises with clear questions, multiple options, and detailed explanations`,
      japanese: `Generate a comprehensive Japanese language lesson with rich, complete content:
- Include actual Japanese text in hiragana, katakana, and kanji as appropriate
- Provide romaji pronunciation and cultural context relevant to Japan
- Create engaging dialogue conversations with real-world scenarios (minimum 3 exchanges per dialogue)
- Design meaningful practice exercises with clear questions, multiple options, and detailed explanations`
  };

  const enhancedPrompt = `${languageInstructions[language]}

Topic: ${topic}
Type: ${lessonType}
Difficulty: ${difficulty}

ABSOLUTE REQUIREMENTS - THESE ARE MANDATORY:
1. Generate between ${minSteps} and ${maxSteps} steps for comprehensive learning
2. Title and description MUST be in English only
3. EVERY step must have complete, real content - NO EMPTY ARRAYS OR PLACEHOLDER TEXT
4. For dialogue steps: MUST include minimum 3 realistic dialogue exchanges between speakers
5. For practice steps: MUST include minimum 3 exercises with complete questions, options, and detailed explanations
6. All ${language} text must be authentic and accurate - no placeholder or example text

REQUIRED STEP DISTRIBUTION:
- 2-3 vocabulary steps with real ${language} words and detailed explanations
- 2-3 phrase steps with practical expressions and usage contexts
- 1-2 dialogue steps with COMPLETE conversations (minimum 3 exchanges each)
- 1-2 practice steps with COMPLETE exercises (minimum 3 exercises each with full content)

Generate this EXACT JSON structure - DO NOT modify field names or structure:
{
  "title": "Engaging English lesson title about ${topic}",
  "description": "Detailed English description explaining what students will learn about ${topic}",
  "language": "${language}",
  "difficulty": "${difficulty}",
  "estimatedMinutes": 30,
  "level": ${difficulty === 'Beginner' ? 1 : difficulty === 'Intermediate' ? 2 : 3},
  "xpReward": 50,
  "order": 0,
  "steps": [
  {
    "stepNumber": 1,
    "type": "vocabulary",
    "title": "Essential Vocabulary",
    "content": {
      "word": "authentic ${language} word - NOT placeholder",
      "translation": "accurate English translation",
      "pronunciation": "detailed pronunciation guide",
      "example": "realistic example sentence in ${language}",
      "notes": "helpful cultural and usage notes"
    }
  },
  {
    "stepNumber": 2,
    "type": "vocabulary",
    "title": "Additional Vocabulary",
    "content": {
      "word": "different authentic ${language} word",
      "translation": "accurate English translation",
      "pronunciation": "detailed pronunciation guide",
      "example": "realistic example sentence in ${language}",
      "notes": "helpful cultural and usage notes"
    }
  },
  {
    "stepNumber": 3,
    "type": "phrase",
    "title": "Common Phrases",
    "content": {
      "phrase": "authentic ${language} phrase",
      "translation": "accurate English translation",
      "pronunciation": "detailed pronunciation guide",
      "example": "realistic usage example in ${language}",
      "notes": "when and how to use this phrase appropriately"
    }
  },
  {
    "stepNumber": 4,
    "type": "dialogue",
    "title": "Real Conversation Practice",
    "content": {
      "dialogue": [
        {
          "speaker": "Person A",
          "text": "authentic ${language} dialogue line",
          "translation": "accurate English translation",
          "pronunciation": "clear pronunciation guide"
        },
        {
          "speaker": "Person B",
          "text": "natural ${language} response",
          "translation": "accurate English translation",
          "pronunciation": "clear pronunciation guide"
        },
        {
          "speaker": "Person A",
          "text": "continued authentic ${language} dialogue",
          "translation": "accurate English translation",
          "pronunciation": "clear pronunciation guide"
        }
      ]
    }
  },
  {
    "stepNumber": 5,
    "type": "practice",
    "title": "Knowledge Assessment",
    "content": {
      "exercises": [
        {
          "id": "ex1",
          "type": "multiple_choice",
          "question": "Specific question about lesson content in English",
          "options": ["Realistic option 1", "Realistic option 2", "Realistic option 3", "Realistic option 4"],
          "correctAnswer": "Realistic option 1",
          "explanation": "Detailed explanation of why this answer is correct with educational context"
        },
        {
          "id": "ex2",
          "type": "fill_in_the_blank",
          "question": "Complete this ${language} phrase: _____ means [specific meaning]",
          "answer": "exact ${language} word or phrase",
          "explanation": "Clear explanation of usage and context with cultural notes"
        },
        {
          "id": "ex3",
          "type": "multiple_choice",
          "question": "Another specific question testing different concept from lesson",
          "options": ["Different option A", "Different option B", "Different option C", "Different option D"],
          "correctAnswer": "Different option A",
          "explanation": "Thorough explanation reinforcing learning objectives"
        }
      ]
    }
  }
  ],
  "culturalNotes": "Rich cultural context about ${language === 'japanese' ? 'Japanese' : 'Spanish-speaking'} culture, customs, and social norms specifically related to ${topic} with practical insights",
  "isActive": true
}

CRITICAL VALIDATION CHECKLIST - VERIFY EACH POINT:
✓ Title and description are in English only
✓ Every dialogue array has minimum 3 complete exchanges with speaker, text, translation, pronunciation
✓ Every exercises array has minimum 3 complete exercises with all required fields
✓ Every multiple choice exercise has 4 options, correctAnswer, and explanation
✓ Every fill_in_the_blank exercise has answer and explanation
✓ All ${language} content is authentic and contextually appropriate
✓ All translations are accurate and natural
✓ Cultural context is meaningful and educational
✓ NO empty arrays [], placeholder text, or missing fields anywhere

GENERATE COMPLETE, HIGH-QUALITY CONTENT ONLY - incomplete lessons will be rejected and regenerated.`;

  const maxAttempts = 3;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const lesson = await generateGeminiJson(enhancedPrompt) as Pick<ILesson,
        'title' | 'description' | 'estimatedMinutes' | 'steps' | 'culturalNotes'
      >;
      validateLessonContent(lesson, minSteps, maxSteps);

      if (generateAudio) {
        for (const step of lesson.steps) {
          if (step.type !== 'vocabulary' && step.type !== 'phrase') continue;
          const textToSpeak = step.content?.word || step.content?.phrase;
          if (typeof textToSpeak === 'string' && textToSpeak) {
            step.content.audio = `tts:${encodeURIComponent(textToSpeak)}:${language}`;
          }
        }
      }

      return lesson;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
    }
  }
}
