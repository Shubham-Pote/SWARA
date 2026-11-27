const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Turn = require('../src/models/companionTurn').default;
const Progress = require('../src/models/progress').default;
const Lesson = require('../src/models/lesson').default;
const ReadingProgress = require('../src/models/readingProgress').default;
const ReadingArticle = require('../src/models/readingArticle').default;
const UserStats = require('../src/models/userStats').default;

const uri = process.env.SWARA_TEST_MONGO_URI;
test('dashboard reports real per-language activity, de-duplicates days and keeps earned streaks', { skip: !uri, timeout: 15000 }, async t => {
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/?$/);
  process.env.JWT_SECRET = randomUUID();
  await mongoose.connect(uri, { dbName: 'swara_dashboard_' + randomUUID() });
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const app = require('../src/app').default;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const userId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const lessonId = new mongoose.Types.ObjectId();
  const articleId = new mongoose.Types.ObjectId();
  const dayMs = 86_400_000;
  const today = Math.floor(Date.now() / dayMs);
  const date = offset => new Date((today + offset) * dayMs);
  const dateKey = offset => date(offset).toISOString().slice(0, 10);
  const idAt = offset => new mongoose.Types.ObjectId(Math.floor(date(offset).getTime() / 1000).toString(16).padStart(8, '0') + new mongoose.Types.ObjectId().toHexString().slice(8));
  const spanish = { userId, language: 'spanish' };
  const exchange = { question: 'Private question', reply: 'Private reply' };

  await Promise.all([
    Turn.collection.insertMany([
      { ...spanish, ...exchange, _id: idAt(-1) }, { ...spanish, ...exchange, _id: idAt(-2) },
      { ...spanish, ...exchange, _id: idAt(-6) }, { ...spanish, ...exchange, _id: idAt(-8) },
      { ...spanish, ...exchange, _id: idAt(-9) }, { ...spanish, ...exchange, _id: idAt(-7) },
      { ...spanish, ...exchange, _id: idAt(-10) },
      { ...spanish, ...exchange, language: 'japanese', _id: idAt(-3) },
      { ...spanish, ...exchange, userId: otherId, _id: idAt(0) },
    ]),
    Lesson.collection.insertOne({ _id: lessonId, title: 'At the market' }),
    ReadingArticle.collection.insertOne({ _id: articleId, title: 'A day in Madrid' }),
    Progress.collection.insertMany([
      { ...spanish, lessonId, status: 'mastered', completedAt: date(0) },
      { ...spanish, lessonId: new mongoose.Types.ObjectId(), status: 'completed' },
      { ...spanish, lessonId: new mongoose.Types.ObjectId(), status: 'in_progress', lastAccessed: date(0) },
    ]),
    ReadingProgress.collection.insertOne({ ...spanish, articleId, status: 'completed', completedAt: date(-2) }),
    UserStats.create({ userId, spanish: { totalXP: 142 }, japanese: { totalXP: 18 } }),
  ]);

  function get(language, id) {
    return fetch(`http://127.0.0.1:${server.address().port}/api/dashboard/${language}`, {
      headers: id ? { Authorization: 'Bearer ' + jwt.sign({ userId: id.toString() }, process.env.JWT_SECRET, { expiresIn: '5m' }) } : {},
    });
  }
  assert.equal((await get('spanish')).status, 401);
  assert.equal((await get('french', userId)).status, 400);
  const response = await get('spanish', userId);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const dashboard = await response.json();
  assert.deepEqual(dashboard.activeDays, [-6, -2, -1, 0].map(dateKey));
  assert.equal(dashboard.streak, 3);
  assert.equal(dashboard.bestStreak, 5);
  assert.equal(dashboard.exchanges, 7);
  assert.equal(dashboard.lessons, 2);
  assert.equal(dashboard.readings, 1);
  assert.equal(dashboard.xp, 142);
  assert.equal(dashboard.recent.length, 5);
  assert.equal(dashboard.recent[0].title, 'At the market');
  assert.equal(dashboard.recent.find(event => event.title === 'A day in Madrid')?.articleId, articleId.toHexString());
  assert.equal(dashboard.recent[0].articleId, undefined);
  assert.doesNotMatch(JSON.stringify(dashboard), /Private (question|reply)/);

  const japanese = await (await get('japanese', userId)).json();
  assert.deepEqual(japanese.activeDays, [dateKey(-3)]);
  assert.equal(japanese.exchanges, 1);
  assert.equal(japanese.streak, 0);
  assert.equal(japanese.xp, 18);
  assert.deepEqual(await (await get('japanese', otherId)).json(), {
    today: dateKey(0), activeDays: [], streak: 0, bestStreak: 0, exchanges: 0, lessons: 0, readings: 0, xp: 0, recent: [],
  });
});
