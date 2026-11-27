import { GoogleGenerativeAIAbortError, GoogleGenerativeAIError, GoogleGenerativeAIFetchError } from '@google/generative-ai';
import { z } from 'zod';
import { IReadingArticle, READING_CONTENT_TYPES } from '../models/readingArticle';
import { generateGeminiJson } from './geminiJson.service';
import { readingStarters } from './readingStarters';

const text = z.string().trim().min(1);
const articleContent = z.object({
  title: text.max(200),
  content: text.max(3000),
  preview: text.max(200),
  estimatedReadTime: z.number().int().min(1).max(15),
  contentWithTranslations: z.array(z.object({
    originalText: text,
    translation: text,
    type: z.enum(['sentence', 'paragraph'])
  })).min(1),
  culturalContext: z.object({
    country: text,
    backgroundInfo: text,
    culturalTips: z.array(text),
    learningPoints: z.array(text)
  }),
  vocabulary: z.array(z.object({
    word: text,
    definition: text,
    pronunciation: text,
    difficulty: z.number(),
    contextSentence: text
  })),
  grammarPoints: z.array(z.object({ concept: text, explanation: text, examples: z.array(text) })),
  comprehensionQuestions: z.array(z.object({
    question: text,
    options: z.array(text).min(2),
    correctAnswer: z.number().int().nonnegative(),
    explanation: text
  }).refine(question => question.correctAnswer < question.options.length, 'Invalid answer index')).min(1),
  interactiveElements: z.object({
    storyChoices: z.array(z.object({ choiceText: text, outcome: text, vocabularyIntroduced: z.array(text) }))
  })
});

const readingTopics = {
  spanish: [
    'Daily Greetings and Introductions', 'Family and Home', 'Food and Restaurants', 'Shopping and Markets',
    'Travel and Transportation', 'Work and Career', 'Spanish Festivals and Traditions',
    'History and Culture', 'Current Events in Spain'
  ],
  japanese: [
    'Japanese Greetings and Politeness', 'Japanese Family Structure', 'Japanese Food Culture',
    'Tokyo Daily Life', 'Japanese Work Culture', 'Seasonal Celebrations', 'Traditional vs Modern Japan',
    'Japanese Technology and Innovation', 'Japanese Literature and Arts'
  ]
};

function temporarilyUnavailable(error: unknown) {
  if (error instanceof GoogleGenerativeAIFetchError) {
    return error.status !== undefined && (error.status >= 500 || error.status === 429 || error.status === 408);
  }
  return error instanceof GoogleGenerativeAIAbortError ||
    (error instanceof GoogleGenerativeAIError && error.message.startsWith('[GoogleGenerativeAI Error]: Error fetching from '));
}

export async function generateReadingArticle(
  language: IReadingArticle['language'],
  userLevel: number,
  completedArticles: number
) {
  const starter = completedArticles === 0;
  const advanced = !starter && (userLevel >= 6 || completedArticles >= 15);
  const intermediate = !starter && (userLevel >= 3 || completedArticles >= 5);
  const difficulty = advanced ? 'Advanced' : intermediate ? 'Intermediate' : 'Beginner';
  const vocabularyDifficulty = advanced ? 3 : intermediate ? 2 : 1;
  const contentType = READING_CONTENT_TYPES[completedArticles % READING_CONTENT_TYPES.length];
  const topics = readingTopics[language];
  const topic = topics[Math.min(completedArticles, topics.length - 1)];
  const region = language === 'spanish' ? 'Spain' : 'Japan';
  const length = starter ? '200–300 words' : '400–600 words';

  const prompt = `Write an engaging, culturally authentic ${difficulty} ${language} reading article about "${topic}" in ${region}.
Use the ${contentType} format. The learner is level ${userLevel} and has completed ${completedArticles} articles.
Aim for ${length}. Keep content under 3000 characters, and keep the title and preview under 200 characters each.
Provide English translations for each original sentence or paragraph, pronunciation guides, cultural context,
grammar examples, comprehension questions with zero-based correctAnswer indexes, and interactive story choices.
${starter ? 'Teach basic greetings in a welcoming, beginner-friendly way.' : 'Build on earlier reading practice.'}

Return JSON with these fields and replace the examples with the actual article:
{
  "title": "Article title in English",
  "estimatedReadTime": ${starter ? 3 : 4},
  "content": "Full article in ${language}",
  "contentWithTranslations": [{"originalText": "Original text", "translation": "English translation", "type": "sentence"}],
  "preview": "Short preview",
  "culturalContext": {"country": "${region}", "backgroundInfo": "Context", "culturalTips": ["Tip"], "learningPoints": ["Learning point"]},
  "vocabulary": [{"word": "Word", "definition": "English definition", "pronunciation": "Guide", "difficulty": ${vocabularyDifficulty}, "contextSentence": "Example sentence"}],
  "grammarPoints": [{"concept": "Concept", "explanation": "Explanation", "examples": ["Example"]}],
  "comprehensionQuestions": [{"question": "Question", "options": ["Option 1", "Option 2", "Option 3", "Option 4"], "correctAnswer": 0, "explanation": "Explanation"}],
  "interactiveElements": {"storyChoices": [{"choiceText": "Choice", "outcome": "Outcome", "vocabularyIntroduced": ["Word"]}]}
}`;

  const details = { language, difficulty, contentType, topic };
  for (const { model, timeout } of [
    { model: 'gemini-3.5-flash-lite', timeout: 12_000 },
    { model: 'gemini-3.5-flash', timeout: 22_000 }
  ]) {
    const signal = AbortSignal.timeout(timeout);
    for (let attempt = 0; attempt < 2 && !signal.aborted; attempt += 1) {
      try {
        const content = articleContent.parse(await generateGeminiJson(prompt, model, signal));
        return { ...content, ...details, aiGenerated: true };
      } catch (error) {
        if (temporarilyUnavailable(error)) break;
        if (attempt || !(error instanceof SyntaxError || error instanceof z.ZodError)) throw error;
      }
    }
  }

  if (!starter) return null;
  const { passages, ...starterContent } = readingStarters[language];
  const contentWithTranslations = passages.map(([originalText, translation]) => ({
    originalText, translation, type: 'paragraph'
  }));
  const content = articleContent.parse({
    ...starterContent,
    content: contentWithTranslations.map(passage => passage.originalText).join('\n\n'),
    contentWithTranslations,
    estimatedReadTime: 2,
    interactiveElements: { storyChoices: [] }
  });
  return { ...content, ...details, aiGenerated: false };
}
