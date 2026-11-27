const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { test } = require('node:test');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../src/models/user').default;
const Turn = require('../src/models/companionTurn').default;
const Stats = require('../src/models/userStats').default;

const uri = process.env.SWARA_TEST_MONGO_URI;
test('companion streams text, performance cues and optional speech with account-specific history', { skip: !uri, timeout: 15000 }, async t => {
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/?$/);
  process.env.JWT_SECRET = randomUUID();
  process.env.GEMINI_API_KEY = 'test';
  await mongoose.connect(uri, { dbName: 'swara_companion_' + randomUUID() });
  t.after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  const app = require('../src/app').default;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const createUser = (displayName, currentLanguage) => User.create({
    displayName, currentLanguage, password: 'password', email: displayName + '@example.test'
  });
  const [learner, other] = await Promise.all([createUser('Ana', 'spanish'), createUser('Ken', 'japanese')]);
  await Stats.create({ userId: learner._id, 'spanish.level': 3 });
  const base = `http://127.0.0.1:${server.address().port}/api/character/`;
  function request(path, user, question, voice, signal = AbortSignal.timeout(5000)) {
    return fetch(base + path, {
      method: question === undefined && !path.endsWith('/new-conversation') ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(user && {
        Authorization: 'Bearer ' + jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '5m' })
      }) }, body: question === undefined ? undefined : JSON.stringify({ message: question, voice }), signal
    });
  }
  let prompt, contents, fail = false, release;
  const gate = new Promise(resolve => { release = resolve; });
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', options => {
    prompt = options.systemInstruction;
    return { generateContentStream: async input => {
      contents = input.contents;
      return { response: Promise.resolve(), stream: (async function* () {
        for (const part of ['[ha', 'ppy] ¡Hola', '!']) yield { text: () => part };
        await gate;
        if (fail) throw new Error('interrupted');
        yield { text: () => ' ¿Cómo estás?' };
      })() };
    } };
  });
  assert.equal((await request('spanish/history')).status, 401);
  assert.equal((await request('french/message', learner, 'hello')).status, 400);
  assert.equal((await request('spanish/message', learner, ' ')).status, 400);
  assert.equal((await request('spanish/message', learner, 'Hola', 'yes')).status, 400);
  const res = await request('spanish/message', learner, 'Hola');
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let wire = '';
  while (!wire.includes('¡Hola')) wire += (await reader.read()).value;
  assert.match(wire, /event: mood\ndata: "happy"/);
  assert.equal(await Turn.countDocuments(), 0);
  release();
  for (;;) { const chunk = await reader.read(); if (chunk.done) break; wire += chunk.value; }
  assert.match(wire, /event: text_end.*event: done/s);
  assert.match(prompt, /María González/);
  assert.match(prompt, /"level":3/);
  assert.match(prompt, /"displayName":"Ana"/);
  assert.ok(!prompt.includes(learner.email));
  assert.deepEqual((await (await request('spanish/history', learner)).json()).turns,
    [{ question: 'Hola', reply: '¡Hola! ¿Cómo estás?' }]);
  assert.deepEqual((await (await request('spanish/history', other)).json()).turns, []);
  fail = true;
  const interrupted = await request('spanish/message', learner, 'Otra pregunta');
  assert.match(await interrupted.text(), /event: error/);
  assert.equal(contents.length, 3);
  assert.equal(await Turn.countDocuments(), 1);
  assert.deepEqual((await (await request('japanese/history', learner)).json()).turns, []);
  await (await request('japanese/message', learner, 'こんにちは')).text();
  assert.match(prompt, /Akira Tanaka/);
  assert.equal(contents.length, 1);

  process.env.ELEVENLABS_API_KEY = 'test-speech-key';
  process.env.ELEVENLABS_MARIA_VOICE_ID = 'testMariaVoice';
  process.env.ELEVENLABS_AKIRA_VOICE_ID = 'testAkiraVoice';
  let releaseTranslation;
  const translation = new Promise(resolve => { releaseTranslation = resolve; });
  let geminiAborted;
  const textCancelled = new Promise(resolve => { geminiAborted = resolve; });
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', () => ({
    generateContentStream: async ({ contents }, { signal }) => {
      const question = contents.at(-1).parts[0].text;
      return {
        response: Promise.resolve({ candidates: [{ finishReason: question === 'Truncated' ? 'MAX_TOKENS' : 'STOP' }] }),
        stream: (async function* () {
          if (question === 'Repeat') {
            for (const part of ['[relaxed:imi', 'tate]\nEnglish: Try this with me.\nSpa', 'nish: ¡buenos', ' días!\n']) yield { text: () => part };
            await translation;
            yield { text: () => 'English: That means good morning. Your turn!' };
          } else if (question === 'Japanese') {
            yield { text: () => '[neutral:invite] English: Hey!\nJapanese: こんにちは。\nEnglish: Want to try saying hello?' };
          } else if (question === 'Japanese unavailable') {
            yield { text: () => '[neutral:invite] Japanese: またね。\nEnglish: See you later.' };
          } else if (question === 'Disconnect') {
            yield { text: () => '[neutral:explain] English: Hello from the roof.\n' };
            await once(signal, 'abort');
            geminiAborted();
            throw signal.reason;
          } else {
            yield { text: () => '[neutral:explain] English: Hello.' };
          }
        })()
      };
    }
  }));
  t.after(releaseTranslation);

  const realFetch = globalThis.fetch;
  const calls = [];
  let upstreamAborted;
  const cancelled = new Promise(resolve => { upstreamAborted = resolve; });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (!String(url).startsWith('https://api.elevenlabs.io/')) return realFetch(url, options);
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    assert.equal(options.headers['xi-api-key'], 'test-speech-key');
    if (body.text === 'またね。') return new Response('unavailable', { status: 429 });
    const frame = JSON.stringify({ audio_base64: 'AAA=', normalized_alignment: {
      characters: ['a'], character_start_times_seconds: [0], character_end_times_seconds: [0.1]
    } });
    const encoder = new TextEncoder();
    return new Response(new ReadableStream({ start(stream) {
      stream.enqueue(encoder.encode(frame.slice(0, 12)));
      stream.enqueue(encoder.encode(frame.slice(12) + '\r\n'));
      if (body.text === 'Hello from the roof.') {
        options.signal.addEventListener('abort', () => { stream.error(options.signal.reason); upstreamAborted(); }, { once: true });
      } else {
        stream.enqueue(encoder.encode(frame));
        stream.close();
      }
    } }));
  });

  const voiced = await request('spanish/message', learner, 'Repeat', true);
  const audioReader = voiced.body.pipeThrough(new TextDecoderStream()).getReader();
  let audioWire = '';
  while (!audioWire.includes('"sequence":3')) {
    const part = await audioReader.read();
    assert.equal(part.done, false);
    audioWire += part.value;
  }
  assert.match(audioWire, /"phase":"listening","cue":"attentive".*"phase":"thinking".*"phase":"responding","cue":"imitate"/s);
  assert.match(audioWire, /event: audio\ndata: {"sequence":0,"audio":"AAA=","alignment":{"characters":\["a"\],"startSeconds":\[0\],"endSeconds":\[0.1\]}}/);
  assert.doesNotMatch(audioWire, /event: done|event: audio_end|Your turn|\[relaxed:imitate\]/);
  assert.equal(await Turn.countDocuments(), 1);
  releaseTranslation();
  for (;;) { const part = await audioReader.read(); if (part.done) break; audioWire += part.value; }
  assert.match(audioWire, /English: That means good morning. Your turn!.*event: text_end.*event: audio_end.*"phase":"idle".*event: done/s);
  assert.deepEqual([...audioWire.matchAll(/"sequence":(\d+)/g)].map(match => Number(match[1])), [0, 1, 2, 3, 4, 5]);
  assert.match(calls[0].url, /testMariaVoice\/stream\/with-timestamps\?output_format=pcm_24000$/);
  assert.deepEqual(calls.slice(0, 3).map(({ body }) => body.language_code), ['en', 'es', 'en']);
  assert.equal(calls[1].body.text, '¡buenos días!');
  assert.equal(calls[1].body.previous_text, 'Try this with me.');
  assert.equal(calls[1].body.voice_settings.speed, 0.85);
  assert.equal(calls[0].body.voice_settings.speed, 1);

  const japanese = await (await request('japanese/message', learner, 'Japanese', true)).text();
  assert.match(japanese, /event: audio_end.*event: done/s);
  assert.deepEqual(calls.slice(3, 6).map(({ body }) => body.language_code), ['en', 'ja', 'en']);
  assert.match(calls[4].url, /testAkiraVoice\/stream/);
  assert.equal(calls[4].body.text, 'こんにちは。');
  const fallback = await (await request('japanese/message', learner, 'Japanese unavailable', true)).text();
  assert.match(fallback, /event: voice_error\ndata: "unavailable".*event: done/s);
  assert.equal(await Turn.countDocuments(), 4);

  delete process.env.ELEVENLABS_AKIRA_VOICE_ID;
  assert.match(await (await request('japanese/message', learner, 'Japanese', true)).text(), /"not_configured".*event: done/s);
  const truncated = await (await request('japanese/message', learner, 'Truncated')).text();
  assert.match(truncated, /event: error\ndata: "incomplete"/);
  assert.doesNotMatch(truncated, /event: text_end/);
  assert.equal(await Turn.countDocuments(), 5);
  assert.equal(calls.length, 7);

  const controller = new AbortController();
  const disconnect = await request('spanish/message', learner, 'Disconnect', true,
    AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]));
  const disconnectReader = disconnect.body.pipeThrough(new TextDecoderStream()).getReader();
  let partial = '';
  while (!partial.includes('event: audio\n')) {
    const part = await disconnectReader.read();
    assert.equal(part.done, false);
    partial += part.value;
  }
  controller.abort();
  await Promise.all([cancelled, textCancelled]);
  assert.equal(calls[7].body.language_code, 'en');
  assert.equal(await Turn.countDocuments(), 5);

  assert.equal((await request('spanish/new-conversation')).status, 401);
  assert.equal((await request('japanese/new-conversation', learner)).status, 204);
  assert.equal((await User.findById(learner._id)).currentLanguage, 'spanish');
  assert.equal((await request('spanish/new-conversation', learner)).status, 204);
  const fresh = await (await request('spanish/history', learner)).json();
  assert.deepEqual(fresh.turns, []);
  assert.deepEqual(fresh.archive.map(turn => turn.question), ['Hola', 'Repeat']);
  t.mock.method(GoogleGenerativeAI.prototype, 'getGenerativeModel', () => ({
    generateContentStream: async input => {
      assert.equal(input.contents.length, 1);
      return { response: Promise.resolve(), stream: (async function* () {
        yield { text: () => '[happy:greet] English: Hello!' };
      })() };
    }
  }));
  assert.match(await (await request('spanish/message', learner, 'New topic')).text(), /event: done/);
  const current = await (await request('spanish/history', learner)).json();
  assert.deepEqual(current.turns.map(turn => turn.question), ['New topic']);
  assert.deepEqual(current.archive.map(turn => turn.question), ['Hola', 'Repeat', 'New topic']);
});
