const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Lesson = require('../src/models/lesson').default;
const Note = require('../src/models/note').default;
const UserStats = require('../src/models/userStats').default;
const notesRoutes = require('../src/routes/notes.routes').default;

const mongoUri = process.env.SWARA_TEST_MONGO_URI;
test('notes keep filters, ownership, and summary generation consistent', { skip: !mongoUri }, async t => {
  assert.match(mongoUri, /^mongodb:\/\/127\.0\.0\.1:\d+\/?$/);
  const secret = randomBytes(32).toString('hex');
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  await mongoose.connect(mongoUri, {
    dbName: `swara_notes_test_${randomBytes(8).toString('hex')}`,
    serverSelectionTimeoutMS: 5000
  });
  t.after(async () => {
    try {
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  await Promise.all([Note.init(), Lesson.init(), UserStats.init()]);

  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const token = user => `Bearer ${jwt.sign({ userId: user }, secret, { expiresIn: '1h' })}`;
  const authorization = token(userId);
  const server = express().use(express.json()).use('/api/notes', notesRoutes).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');

  async function request(path = '', method = 'GET', body, auth = authorization) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/notes${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: auth }) },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  const draft = { title: '  Plan (draft) [A]  ', content: '  Study plan  ', language: 'spanish', topic: '', tags: ['draft'] };
  assert.equal((await request('', 'POST', draft, null)).status, 401);
  assert.equal((await request('', 'POST', { ...draft, title: '   ' })).status, 400);
  assert.equal((await request('', 'POST', { ...draft, content: 'x'.repeat(10001) })).status, 400);
  assert.equal((await request('', 'POST', { ...draft, topic: 'Unknown' })).status, 400);
  assert.equal((await request('?language=spanish&language=japanese')).status, 400);
  const [manual, grammar] = await Promise.all([
    request('', 'POST', draft),
    request('', 'POST', { ...draft, title: 'Drills', topic: 'Grammar', tags: ['C++'] })
  ]);
  assert.deepEqual([manual.status, grammar.status], [201, 201]);
  assert.equal(manual.body.note.title, 'Plan (draft) [A]');
  assert.equal(manual.body.note.content, 'Study plan');
  assert.equal(manual.body.note.topic, undefined);
  assert.equal((await UserStats.findOne({ userId })).spanish.studyMore.notesCreated, 2);
  await Note.collection.insertOne({ userId, title: 'Old note', content: 'Saved before flags', language: 'spanish' });
  assert.equal((await request('?topic=my-notes')).body.total, 3);
  assert.equal((await request('?topic=All')).body.total, 3);
  assert.equal((await request('?topic=Grammar')).body.notes[0]._id, grammar.body.note._id);
  assert.equal((await request('?search=%5B')).body.notes[0]._id, manual.body.note._id);
  assert.equal((await request('?search=C%2B%2B')).body.notes[0]._id, grammar.body.note._id);
  assert.equal((await request('?search=.*')).body.total, 0);

  const manualPath = `/${manual.body.note._id}`;
  assert.equal((await request(`${manualPath}/star`, 'PUT', undefined, token(otherUserId))).status, 404);
  assert.equal((await request(manualPath, 'DELETE', undefined, token(otherUserId))).status, 404);
  assert.equal((await request('/invalid/star', 'PUT')).status, 400);
  assert.equal((await request('/invalid', 'DELETE')).status, 400);
  const toggles = await Promise.all([request(`${manualPath}/star`, 'PUT'), request(`${manualPath}/star`, 'PUT')]);
  assert.deepEqual(toggles.map(result => result.body.starred).sort(), [false, true]);
  assert.equal((await request(`${manualPath}/star`, 'PUT')).body.starred, true);
  assert.equal((await request('?topic=starred')).body.total, 1);

  const edit = { ...draft, title: '  Revised plan  ', content: 'Next steps', topic: 'Pronunciation', language: 'japanese', starred: false, aiGenerated: true };
  assert.equal((await request(manualPath, 'PUT', edit, null)).status, 401);
  assert.equal((await request(manualPath, 'PUT', edit, token(otherUserId))).status, 404);
  assert.equal((await request('/invalid', 'PUT', edit)).status, 400);
  assert.equal((await request(manualPath, 'PUT', { ...edit, content: ' ' })).status, 400);
  const revised = await request(manualPath, 'PUT', edit);
  assert.equal(revised.status, 200);
  assert.equal(revised.body.note.title, 'Revised plan');
  assert.equal(revised.body.note.language, 'spanish');
  assert.equal(revised.body.note.starred, true);
  assert.equal(revised.body.note.aiGenerated, false);
  assert.equal((await request('?topic=Pronunciation')).body.notes[0].content, 'Next steps');
  assert.equal((await request(manualPath, 'PUT', draft)).body.note.topic, undefined);
  assert.equal((await UserStats.findOne({ userId })).spanish.studyMore.notesCreated, 2);

  const content = {
    title: 'Greetings', description: 'Greet a friend', language: 'spanish',
    difficulty: 'Beginner', level: 1, estimatedMinutes: 5, culturalNotes: 'x'.repeat(10000),
    steps: [
      { stepNumber: 1, title: 'Vocabulary', type: 'vocabulary', content: { word: 'Hola' } },
      { stepNumber: 2, title: 'Practice the phrase', type: 'phrase', content: { phrase: 'Buenos días', translation: 'Good morning' } }
    ]
  };
  const [lesson, legacyLesson] = await Lesson.create([content, { ...content, title: 'Legacy lesson' }]);
  const generate = { lessonId: lesson.id, language: 'japanese' };
  assert.equal((await request('/generate', 'POST', { ...generate, lessonId: 'invalid' })).status, 400);
  assert.equal((await request('/generate', 'POST', { ...generate, lessonId: String(new mongoose.Types.ObjectId()) })).status, 404);
  const results = await Promise.all(Array.from({ length: 6 }, () => request('/generate', 'POST', generate)));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 200, 200, 200, 200, 201]);
  const { note } = results.find(result => result.status === 201).body;
  assert.ok(results.every(result => result.body.note._id === note._id));
  assert.ok(results.filter(result => result.status === 200).every(result => result.body.alreadyExists));
  assert.equal(note.language, 'spanish');
  assert.equal(note.summaryKey, undefined);
  assert.match(note.content, /Hola/);
  assert.match(note.content, /Buenos días/);
  assert.doesNotMatch(note.content, /undefined/);
  assert.match(note.content, /Summary shortened to fit the note/);
  assert.ok(note.content.length <= 10000);
  assert.equal((await request('?topic=ai-generated')).body.notes[0].lessonId.title, lesson.title);

  const oldSummary = { userId, lessonId: legacyLesson._id, language: 'spanish', aiGenerated: true, tags: ['lesson-notes'] };
  const legacy = await Note.create([
    { ...oldSummary, title: 'First old summary', content: 'Keep both old notes' },
    { ...oldSummary, title: 'Second old summary', content: 'Keep both old notes' }
  ]);
  const existing = await request('/generate', 'POST', { ...generate, lessonId: legacyLesson.id });
  assert.equal(existing.status, 200);
  assert.equal(existing.body.alreadyExists, true);
  assert.equal(existing.body.note._id, legacy[0].id);
  assert.equal(await Note.countDocuments({ userId, lessonId: legacyLesson._id }), 2);
  assert.equal((await UserStats.findOne({ userId })).spanish.studyMore.lessonSummaries, 1);
  assert.deepEqual((await request('/stats')).body.stats, {
    totalNotes: 6, aiGenerated: 3, starred: 1, myNotes: 3, uniqueTags: 5
  });
  assert.deepEqual((await request('/stats', 'GET', undefined, token(otherUserId))).body.stats, {
    totalNotes: 0, aiGenerated: 0, starred: 0, myNotes: 0, uniqueTags: 0
  });

  assert.equal((await request(`/${note._id}`, 'DELETE')).status, 200);
  assert.equal((await request('/stats')).body.stats.aiGenerated, 2);
  const regenerated = await request('/generate', 'POST', generate);
  assert.equal(regenerated.status, 201);
  assert.notEqual(regenerated.body.note._id, note._id);
  assert.equal((await UserStats.findOne({ userId })).spanish.studyMore.lessonSummaries, 2);

  const page = '/' + new mongoose.Types.ObjectId();
  const first = { revision: -1, writeId: require('node:crypto').randomUUID(), language: 'spanish', content: 'Mañana\nTomorrow.' };
  assert.equal((await request(page, 'PATCH', { ...first, content: '   ' })).status, 400);
  const created = await request(page, 'PATCH', first);
  assert.equal(created.status, 201);
  assert.equal(created.body.note.title, 'Mañana');
  assert.equal((await request(page, 'PATCH', first)).body.note._id, created.body.note._id);
  const next = { ...first, revision: 0, writeId: require('node:crypto').randomUUID(), content: 'Hasta mañana\nSee you tomorrow.' };
  assert.equal((await request(page, 'PATCH', next, token(otherUserId))).status, 409);
  assert.equal((await request(page, 'PATCH', next)).body.note.title, 'Hasta mañana');
  assert.equal((await request(page, 'PATCH', { ...next, writeId: require('node:crypto').randomUUID() })).status, 409);
  assert.equal((await request(page, 'PATCH', next)).body.note.revision, 1);
  const titleOnly = await request('/' + new mongoose.Types.ObjectId(), 'PATCH', {
    ...first, content: '', title: 'Words to revisit'
  });
  assert.equal(titleOnly.status, 201);
  assert.equal(titleOnly.body.note.title, 'Words to revisit');
  assert.equal(titleOnly.body.note.content, '');
  const readingId = String(new mongoose.Types.ObjectId());
  const capture = await request('', 'POST', { ...draft, readingId });
  assert.equal(capture.body.note.readingId, readingId);
  const recaptured = await request('/' + capture.body.note._id, 'PATCH', next);
  assert.equal(recaptured.body.note.readingId, readingId);
});
