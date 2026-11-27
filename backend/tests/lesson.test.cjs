const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Lesson = require('../src/models/lesson').default;
const Progress = require('../src/models/progress').default;
const UserStats = require('../src/models/userStats').default;
const lessonRoutes = require('../src/routes/lesson.routes').default;

const mongoUri = process.env.SWARA_TEST_MONGO_URI;
test('lesson routes preserve MongoDB progress and award XP once', { skip: !mongoUri }, async t => {
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
    dbName: `swara_lessons_test_${randomBytes(8).toString('hex')}`,
    serverSelectionTimeoutMS: 5000
  });
  t.after(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  await Promise.all([Lesson.init(), Progress.init(), UserStats.init()]);
  const userId = new mongoose.Types.ObjectId();
  const authorization = `Bearer ${jwt.sign({ userId }, secret, { expiresIn: '1h' })}`;
  const app = express().use(express.json()).use('/api/lessons', lessonRoutes);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');

  async function request(path, method = 'GET', body, authenticated = true) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/lessons/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(authenticated && { Authorization: authorization }) },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  const content = {
    title: 'Greetings', description: 'Learn to greet people', language: 'spanish',
    difficulty: 'Beginner', level: 1, estimatedMinutes: 10, xpReward: 60,
    steps: [1, 2, 3].map(stepNumber => ({
      stepNumber, title: `Step ${stepNumber}`, type: 'vocabulary', content: { word: 'Hola' }
    }))
  };
  const [lesson, earlierLesson] = await Lesson.create([
    { ...content, order: 2 },
    { ...content, order: 1, title: 'Introductions' },
    { ...content, isActive: false },
    { ...content, language: 'japanese' }
  ]);

  assert.equal((await request('spanish', 'GET', undefined, false)).status, 401);
  assert.equal((await request('french')).status, 400);
  assert.equal((await request('lesson/invalid')).status, 400);
  assert.equal((await request(`lesson/${new mongoose.Types.ObjectId()}`)).status, 404);
  const list = await request('spanish');
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.lessons.map(item => item._id), [String(earlierLesson.id), String(lesson.id)]);
  assert.equal(list.body.lessons[0].progress, 0);

  const path = `${lesson.id}/progress`;
  const first = { language: 'japanese', currentStep: 0, totalSteps: 1, completed: true, timeSpent: 30 };
  assert.equal((await request(path, 'PUT', { ...first, timeSpent: -1 })).status, 400);
  const partial = await request(path, 'PUT', first);
  assert.equal(partial.status, 200);
  assert.equal(partial.body.progress.completed, false);
  assert.equal(partial.body.progress.totalSteps, 3);
  assert.equal((await request(`lesson/${lesson.id}`)).body.lesson.currentProgress, 1);
  assert.equal((await Progress.findOne({ userId, lessonId: lesson.id })).language, 'spanish');

  const completion = { language: 'spanish', currentStep: 2, completed: true, score: 80, timeSpent: 30 };
  t.mock.method(console, 'error', () => {});
  t.mock.method(UserStats.collection, 'updateOne').mock.mockImplementationOnce(async () => {
    throw new Error('Test interrupted stats write');
  });
  assert.equal((await request(path, 'PUT', completion)).status, 503);
  assert.equal((await UserStats.findOne({ userId })).spanish.totalXP, 0);
  const [retry, refresh] = await Promise.all([
    request(path, 'PUT', completion),
    request(path, 'PUT', completion)
  ]);
  assert.deepEqual([retry.status, refresh.status], [200, 200]);
  assert.equal(retry.body.progress.xpAwarded + refresh.body.progress.xpAwarded, 60);
  assert.equal(retry.body.progress.progress, 100);
  assert.equal(retry.body.progress.timeSpent, 60);
  assert.equal((await request(`lesson/${lesson.id}`)).body.lesson.currentProgress, 0);

  const concurrent = await Promise.all([
    request(`${earlierLesson.id}/progress`, 'PUT', { ...completion, timeSpent: 5, score: 92 }),
    request(`${earlierLesson.id}/progress`, 'PUT', { ...completion, timeSpent: 5, score: 92 })
  ]);
  assert.deepEqual(concurrent.map(result => result.status), [200, 200]);
  assert.equal(concurrent.reduce((total, result) => total + result.body.progress.xpAwarded, 0), 60);
  assert.equal(await Progress.countDocuments({ userId, lessonId: earlierLesson.id }), 1);

  const legacyLesson = await Lesson.create({ ...content, title: 'Legacy lesson' });
  await Progress.collection.insertOne({
    userId, lessonId: legacyLesson._id, language: 'spanish', xpAwarded: true,
    status: 'completed', completedAt: new Date(), currentStep: 2, totalSteps: 3, timeSpent: 60
  });
  const legacy = await request(`${legacyLesson.id}/progress`, 'PUT', {
    language: 'spanish', currentStep: 0, timeSpent: 10
  });
  assert.equal(legacy.status, 200);
  assert.equal(legacy.body.progress.completed, true);
  assert.equal(legacy.body.progress.timeSpent, 70);
  assert.equal(legacy.body.progress.xpAwarded, 0);

  const stats = await UserStats.findOne({ userId });
  assert.equal(stats.spanish.totalXP, 120);
  assert.equal(stats.spanish.timeSpent, 75);
  assert.equal(stats.spanish.lessonsCompleted, 2);
  assert.equal(stats.spanish.averageScore, 86);
  assert.equal(stats.japanese.totalXP, 0);
  const dashboard = await request('spanish/dashboard');
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.dashboard.level, 2);
  assert.equal(dashboard.body.dashboard.currentStreak, 1);
  assert.equal(dashboard.body.dashboard.completedLessons, 3);
  assert.equal(dashboard.body.dashboard.timeSpent, 1);

  const generation = { language: 'spanish', difficulty: 'Beginner', topic: 'Greetings', generateAudio: true };
  assert.equal((await request('generate', 'POST', generation, false)).status, 401);
  assert.equal((await request('generate', 'POST', generation)).status, 503);
  process.env.GEMINI_API_KEY = 'test-key';
  let providerCalls = 0;
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', () => ({
    generateContent: async () => {
      providerCalls += 1;
      const text = providerCalls === 1 ? 'bad response' : JSON.stringify({
        ...content,
        language: 'japanese',
        xpReward: 5000,
        steps: [...content.steps, { ...content.steps[0], stepNumber: 4 }, {
          stepNumber: 5, title: 'Dialogue', type: 'dialogue',
          content: { dialogue: [
            { speaker: 'A', text: 'Hola', translation: 'Hello' },
            { speaker: 'B', text: 'Adiós', translation: 'Goodbye' }
          ] }
        }, {
          stepNumber: 6, title: 'Practice', type: 'practice',
          content: { exercises: ['a', 'b'].map(id => ({
            id, type: 'fill_in_the_blank', question: 'Enter a greeting', answer: 'Hola', explanation: 'Hello'
          })) }
        }]
      });
      return { response: { text: () => text } };
    }
  }));
  const generated = await request('generate', 'POST', generation);
  assert.equal(generated.status, 201);
  assert.equal(providerCalls, 2);
  const persisted = await Lesson.findById(generated.body.lesson._id);
  assert.equal(persisted.language, 'spanish');
  assert.equal(persisted.xpReward, 50);
  assert.equal(persisted.steps[0].content.audio, 'tts:Hola:spanish');
});
