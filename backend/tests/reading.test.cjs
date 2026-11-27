const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const { GoogleGenerativeAI, GoogleGenerativeAIError, GoogleGenerativeAIFetchError } = require('@google/generative-ai');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const ReadingArticle = require('../src/models/readingArticle').default;
const ReadingProgress = require('../src/models/readingProgress').default;
const UserStats = require('../src/models/userStats').default;
const readingRoutes = require('../src/routes/readingArticle.routes').default;

const mongoUri = process.env.SWARA_TEST_MONGO_URI;
test('reading routes preserve ownership and recover interrupted assignments and completions', { skip: !mongoUri }, async t => {
  assert.match(mongoUri, /^mongodb:\/\/127\.0\.0\.1:\d+\/?$/);
  const secret = randomBytes(32).toString('hex');
  const previousSecret = process.env.JWT_SECRET;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  process.env.JWT_SECRET = secret;
  delete process.env.GEMINI_API_KEY;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiKey;
  });

  await mongoose.connect(mongoUri, {
    dbName: `swara_reading_test_${randomBytes(8).toString('hex')}`,
    serverSelectionTimeoutMS: 5000
  });
  t.after(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  await Promise.all([ReadingArticle.init(), ReadingProgress.init(), UserStats.init()]);

  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const token = user => `Bearer ${jwt.sign({ userId: user }, secret, { expiresIn: '1h' })}`;
  const authorization = token(userId);
  const server = express().use(express.json()).use('/api/reading', readingRoutes).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');

  async function request(path, method = 'GET', body, auth = authorization) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/reading/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: auth }) },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  assert.equal((await request('current/spanish', 'GET', undefined, null)).status, 401);
  assert.equal((await request('current/french')).status, 400);
  assert.equal((await request('article/invalid')).status, 400);
  assert.equal((await request('next/spanish', 'POST')).status, 400);
  assert.equal((await request('current/spanish')).status, 503);
  assert.equal((await request('articles/spanish')).body.currentArticle, null);
  await UserStats.create({ userId, spanish: { level: 4 } });

  const content = {
    title: 'Daily greetings', content: 'Hola. Buenos días.', preview: 'Two ways to greet someone',
    estimatedReadTime: 3,
    contentWithTranslations: [{ originalText: 'Hola.', translation: 'Hello.', type: 'sentence' }],
    culturalContext: { country: 'Spain', backgroundInfo: 'Common greetings', culturalTips: [], learningPoints: [] },
    vocabulary: [], grammarPoints: [], interactiveElements: { storyChoices: [] },
    comprehensionQuestions: [0, 1, 0].map(correctAnswer => ({
      question: 'Which phrase matches?', options: ['Hola', 'Adiós'], correctAnswer, explanation: 'Common greeting'
    }))
  };
  process.env.GEMINI_API_KEY = 'test-key';
  let providerCalls = 0;
  const getModel = t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', ({ model }) => {
    assert.equal(model, 'gemini-3.5-flash-lite');
    return { generateContent: async () => {
      providerCalls += 1;
      const output = providerCalls === 1
        ? { ...content, comprehensionQuestions: [{ ...content.comprehensionQuestions[0], correctAnswer: 99 }] }
        : { ...content, language: 'japanese', generatedFor: String(otherUserId) };
      return { response: { text: () => JSON.stringify(output) } };
    } };
  });

  const starters = await Promise.all(Array.from({ length: 5 }, () => request('current/spanish')));
  assert.ok(starters.every(result => result.status === 200));
  assert.equal(starters.filter(result => result.body.isNew).length, 1);
  const article = starters[0].body.article;
  assert.ok(starters.every(result => result.body.article._id === article._id));
  assert.equal(article.language, 'spanish');
  assert.equal(article.generatedFor, String(userId));
  assert.equal(article.generationKey, undefined);
  assert.equal(article.difficulty, 'Beginner');
  assert.equal(article.isStarterArticle, true);
  assert.equal(await ReadingArticle.countDocuments({ generatedFor: userId }), 1);
  assert.equal(await ReadingProgress.countDocuments({ userId }), 1);
  assert.ok(providerCalls >= 2);
  assert.equal((await request(`article/${article._id}`, 'GET', undefined, token(otherUserId))).status, 404);
  assert.equal((await request(`start/${article._id}`, 'POST', undefined, token(otherUserId))).status, 404);
  assert.equal((await request('next/spanish', 'POST')).status, 400);

  const attempts = await Promise.all([request(`start/${article._id}`, 'POST'), request(`start/${article._id}`, 'POST')]);
  assert.ok(attempts.every(result => result.body.progress.status === 'reading'));
  assert.equal(attempts[0].body.progress.startedAt, attempts[1].body.progress.startedAt);
  const quiz = `complete/${article._id}`;
  const passing = { answers: [0, 1, 0], timeSpent: 90 };
  const failing = { answers: [1, 0, 1], timeSpent: 20 };
  assert.equal((await request(quiz, 'POST', passing, token(otherUserId))).status, 404);
  assert.equal((await request(quiz, 'POST', { ...passing, answers: [0, 1] })).status, 400);
  assert.equal((await request(quiz, 'POST', { ...passing, answers: [99, 1, 0] })).status, 400);
  assert.equal((await request(quiz, 'POST', { ...passing, timeSpent: -1 })).status, 400);
  assert.equal((await request(quiz, 'POST', failing)).body.results.passed, false);
  assert.equal((await request('articles/spanish')).body.currentArticle.progress.status, 'reading');

  t.mock.method(console, 'error', () => {});
  t.mock.method(UserStats.collection, 'updateOne').mock.mockImplementationOnce(async () => {
    throw new Error('Test interrupted reading stats write');
  });
  assert.equal((await request(quiz, 'POST', passing)).body.results.passed, true);
  assert.equal((await UserStats.findOne({ userId })).spanish.studyMore.articlesCompleted, 0);
  const repeats = await Promise.all([request(quiz, 'POST', passing), request(quiz, 'POST', failing)]);
  assert.ok(repeats.every(result => result.body.results.passed && result.body.results.score === 100 &&
    result.body.results.correctAnswers === 3 && result.body.results.timeSpent === 90));
  assert.equal((await request(`start/${article._id}`, 'POST')).body.progress.status, 'completed');
  const history = await request('articles/spanish');
  assert.equal(history.body.currentArticle, null);
  assert.equal(history.body.completedArticles[0].progress.quizAttempts, 2);
  assert.equal((await UserStats.findOne({ userId })).spanish.studyMore.articlesCompleted, 1);

  t.mock.method(ReadingProgress.collection, 'findOneAndUpdate').mock.mockImplementationOnce(async () => {
    throw new Error('Test interrupted progress assignment');
  });
  assert.equal((await request('next/spanish', 'POST')).status, 500);
  assert.equal(await ReadingArticle.countDocuments({ generatedFor: userId }), 2);
  delete process.env.GEMINI_API_KEY;
  const next = await request('current/spanish');
  assert.equal(next.status, 200);
  assert.equal(next.body.article.difficulty, 'Intermediate');
  assert.equal(next.body.article.isStarterArticle, false);
  assert.equal(next.body.article.generationMetadata.userLevel, 4);
  assert.equal((await request('current/spanish')).body.isNew, false);

  const [shared, older] = await ReadingArticle.create(['Shared', 'Older'].map(title => ({
    ...content, title, language: 'spanish', difficulty: 'Beginner', contentType: 'mini-stories', topic: 'Greetings'
  })));
  assert.equal((await request(`article/${shared.id}`, 'GET', undefined, token(otherUserId))).status, 200);
  assert.equal((await request(`complete/${shared.id}`, 'POST', passing, token(otherUserId))).status, 404);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  await ReadingProgress.create([
    { userId, articleId: shared._id, language: 'spanish', status: 'completed', completedAt: new Date(), quizScore: 70, timeSpent: 30 },
    { userId, articleId: older._id, language: 'spanish', status: 'completed', completedAt: yesterday, quizScore: 80, timeSpent: 60 }
  ]);
  assert.deepEqual((await request('stats/spanish')).body.stats, {
    totalCompleted: 3, averageScore: 83, totalTimeSpent: 3, currentStreak: 2, language: 'spanish'
  });

  assert.equal((await request(`complete/${next.body.article._id}`, 'POST', passing)).body.results.passed, true);
  process.env.GEMINI_API_KEY = 'test-key';
  const generated = await request('next/spanish', 'POST');
  assert.equal(generated.status, 200);
  assert.equal(generated.body.progress.status, 'not_started');
  assert.equal(generated.body.article.generationMetadata.completedArticles, 4);

  const noQuiz = await ReadingArticle.create({
    ...content, title: 'Legacy article', language: 'japanese', difficulty: 'Beginner',
    contentType: 'mini-stories', topic: 'Greetings', comprehensionQuestions: []
  });
  await ReadingProgress.create({ userId: otherUserId, articleId: noQuiz._id, language: 'japanese' });
  const noQuizCompletions = await Promise.all(Array.from({ length: 2 }, () =>
    request(`complete/${noQuiz.id}`, 'POST', { answers: [] }, token(otherUserId))
  ));
  assert.ok(noQuizCompletions.every(result => result.body.results.score === 100));
  assert.equal((await ReadingProgress.findOne({ userId: otherUserId, articleId: noQuiz._id })).quizAttempts, 1);
  assert.equal((await UserStats.findOne({ userId: otherUserId })).japanese.studyMore.articlesCompleted, 1);

  const models = [];
  let secondaryAvailable = true;
  getModel.mock.mockImplementation(({ model }) => ({ generateContent: async () => {
    models.push(model);
    if (model === 'gemini-3.5-flash' && secondaryAvailable) {
      return { response: { text: () => JSON.stringify(content) } };
    }
    if (model === 'gemini-3.5-flash') throw new GoogleGenerativeAIError('Error fetching from Gemini: fetch failed');
    throw new GoogleGenerativeAIFetchError('Overloaded', 503);
  } }));

  const alternate = await request('current/spanish', 'GET', undefined, token(otherUserId));
  assert.equal(alternate.status, 200);
  assert.equal(alternate.body.article.generationMetadata.aiGenerated, true);
  assert.deepEqual(models.splice(0), ['gemini-3.5-flash-lite', 'gemini-3.5-flash']);

  secondaryAvailable = false;
  for (const language of ['spanish', 'japanese']) {
    const starterAuth = token(new mongoose.Types.ObjectId());
    const starter = await request(`current/${language}`, 'GET', undefined, starterAuth);
    assert.equal(starter.status, 200);
    assert.equal(starter.body.article.language, language);
    assert.equal(starter.body.article.generationMetadata.aiGenerated, false);
    assert.deepEqual(models.splice(0), ['gemini-3.5-flash-lite', 'gemini-3.5-flash']);
    const { _id, comprehensionQuestions } = starter.body.article;
    assert.equal((await request(`current/${language}`, 'GET', undefined, starterAuth)).body.article._id, _id);
    assert.equal(models.length, 0);
    const answers = comprehensionQuestions.map(question => question.correctAnswer);
    assert.equal((await request(`complete/${_id}`, 'POST', { answers }, starterAuth)).body.results.passed, true);
    const unavailable = await request(`next/${language}`, 'POST', undefined, starterAuth);
    assert.equal(unavailable.status, 503);
    assert.match(unavailable.body.message, /Try again/);
    assert.deepEqual(models.splice(0), ['gemini-3.5-flash-lite', 'gemini-3.5-flash']);
  }
});
