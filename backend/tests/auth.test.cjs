const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user').default;
const UserStats = require('../src/models/userStats').default;
const authRoutes = require('../src/routes/auth.routes').default;

test('auth routes validate input and recover stats after an interrupted registration', async t => {
  const previousSecret = process.env.JWT_SECRET;
  const secret = randomBytes(32).toString('hex');
  delete process.env.JWT_SECRET;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  let user;
  let stats;
  let failStatsWrite = true;
  t.mock.method(User.collection, 'insertOne', async document => {
    user = document;
    return { insertedId: document._id };
  });
  t.mock.method(User.collection, 'findOne', async (filter, { projection } = {}) => {
    if (!user || (filter.email && filter.email !== user.email) ||
        (filter._id && !filter._id.equals(user._id))) return null;
    const document = { ...user };
    if (projection?.password === 0) delete document.password;
    return document;
  });
  t.mock.method(User.collection, 'findOneAndUpdate', async (filter, update, options) => {
    assert.ok(filter._id.equals(user._id));
    assert.equal(options.projection.password, 0);
    Object.assign(user, update.$set);
    const { password, ...profile } = user;
    return profile;
  });
  t.mock.method(UserStats.collection, 'findOne', async () => stats ?? null);
  t.mock.method(UserStats.collection, 'findOneAndUpdate', async (filter, update) => {
    assert.ok(filter.userId.equals(user._id));
    if (failStatsWrite) throw new Error('Test database write interrupted');
    stats ??= new UserStats({ userId: filter.userId }).toObject();
    if (update.$setOnInsert) {
      assert.equal(update.$setOnInsert['spanish.level'], 1);
      assert.equal(update.$setOnInsert['japanese.studyMore.articlesCompleted'], 0);
    }
    for (const [path, value] of Object.entries(update.$set)) {
      if (path.startsWith('preferences.')) stats.preferences[path.split('.')[1]] = value;
    }
    return stats;
  });
  t.mock.method(console, 'error', () => {});

  const app = express().use(express.json()).use('/api/auth', authRoutes);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await once(server, 'listening');
  async function request(path, method = 'GET', body, authorization) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authorization && { Authorization: authorization })
      },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  const credentials = { email: ' Test@example.com ', password: 'test-password', displayName: ' Test ' };
  assert.equal((await request('register', 'POST', credentials)).status, 503);
  assert.equal(user, undefined);
  process.env.JWT_SECRET = secret;

  assert.equal((await request('register', 'POST', { ...credentials, password: 'é'.repeat(37) })).status, 400);
  assert.equal((await request('login', 'POST', { ...credentials, email: {} })).status, 400);
  const interrupted = await request('register', 'POST', credentials);
  assert.equal(interrupted.status, 503);
  assert.match(interrupted.body.message, /Sign in/);
  assert.equal(user.email, 'test@example.com');
  assert.notEqual(user.password, credentials.password);

  failStatsWrite = false;
  assert.equal((await request('login', 'POST', { ...credentials, password: 'wrong' })).status, 401);
  assert.equal(stats, undefined);
  const login = await request('login', 'POST', credentials);
  assert.equal(login.status, 200);
  assert.equal(login.body.user.displayName, 'Test');
  assert.equal(login.body.user.password, undefined);
  assert.equal((await request('register', 'POST', credentials)).status, 400);

  const auth = `Bearer ${login.body.token}`;
  const invalidToken = jwt.sign({ userId: 'invalid-id' }, secret, { expiresIn: '1h' });
  assert.equal((await request('profile')).status, 401);
  assert.equal((await request('profile', 'GET', undefined, `Bearer ${invalidToken}`)).status, 401);
  assert.equal((await request('profile', 'GET', undefined, login.body.token)).status, 401);
  const profile = await request('profile', 'GET', undefined, auth);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.stats.level, 1);
  assert.equal(profile.body.user.password, undefined);
  assert.equal((await request('profile', 'PUT', { bio: [] }, auth)).status, 400);
  assert.equal((await request('profile', 'PUT', { bio: ' Updated ' }, auth)).body.user.bio, 'Updated');
  assert.equal((await request('language', 'PUT', { language: 'japanese' }, auth)).body.currentLanguage, 'japanese');
  const languageStats = await request('language-stats', 'GET', undefined, auth);
  assert.equal(languageStats.body.languages.japanese.level, 1);
  assert.equal(languageStats.body.languages.japanese.studyMore, undefined);
  assert.equal(languageStats.body.currentLanguage, 'japanese');
  assert.equal((await request('preferences', 'PUT', { reminderTime: '99:00' }, auth)).status, 400);
  assert.equal((await request('preferences', 'PUT', { dailyGoal: 30 }, auth)).body.preferences.dailyGoal, 30);

  user = undefined;
  stats = undefined;
  const registration = await request('register', 'POST', credentials);
  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.currentLanguage, 'spanish');
  assert.equal(registration.body.user.password, undefined);
  assert.ok(registration.body.token);
  assert.equal(stats.spanish.level, 1);
});
