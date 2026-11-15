const assert = require('node:assert/strict');
const { resetDb } = require('./helpers');
const db = require('../src/data/db');
const suggestionService = require('../src/services/suggestionService');
const { createGeminiClient, ProviderTimeoutError, ProviderRateLimitError } = require('../src/ai/assistant');
const { ValidationError, UnavailableError, BusyError, UnusableAnswerError } = require('../src/services/errors');

// Wednesday 2030-01-09, 09:00 local time
const NOW = new Date(2030, 0, 9, 9, 0, 0);

// A fake client: it never touches the network and answers whatever the test needs.
const answering = (reply) => ({ prompts: [], async generate(prompt) { this.prompts.push(prompt); return reply; } });
const failing = (error) => ({ async generate() { throw error; } });
const slot = (over = {}) => JSON.stringify({ lab: 'Computer Lab 1', date: '2030-01-16', hour: 14, ...over });

describe('Slice 4: the assistant suggests a slot', () => {
  beforeEach(() => resetDb());

  const bookingCount = () => db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n;
  const ask = (client, text = '20 computers on Wednesday afternoon') => suggestionService.suggestSlot(text, { client, now: NOW });

  it('AC-22 a real lab and a bookable hour become a suggestion and no booking is created', async () => {
    const client = answering(slot());
    const suggestion = await ask(client);
    assert.equal(suggestion.lab.name, 'Computer Lab 1');
    assert.equal(suggestion.lab.room, 'Room 101');
    assert.equal(suggestion.date, '2030-01-16');
    assert.equal(suggestion.hour, 14);
    assert.equal(bookingCount(), 0);
  });

  it('AC-22 the prompt carries the request, today\'s date and the labs from the database, and no personal data', async () => {
    const client = answering(slot());
    await ask(client);
    const prompt = client.prompts[0];
    assert.match(prompt, /20 computers on Wednesday afternoon/);
    assert.match(prompt, /2030-01-09/);
    assert.match(prompt, /Computer Lab 1/);
    assert.match(prompt, /Hardware Lab/);
    assert.doesNotMatch(prompt, /@example\.com/);
  });

  it('AC-22 an answer wrapped in a code fence and with a lab name in other letters is still understood', async () => {
    const suggestion = await ask(answering('```json\n' + slot({ lab: ' computer lab 1 ' }) + '\n```'));
    assert.equal(suggestion.lab.name, 'Computer Lab 1');
  });

  [
    ['text that is not JSON', 'Sure! Try the big lab on Wednesday.'],
    ['JSON that is not an object', '42'],
    ['a lab that does not exist', slot({ lab: 'Moon Base' })],
    ['an hour in the past', slot({ date: '2030-01-08' })],
    ['an hour that already began today', slot({ date: '2030-01-09', hour: 9 })],
    ['an hour outside 08:00-20:00', slot({ hour: 22 })],
    ['an hour that is not a whole number', slot({ hour: 'afternoon' })],
    ['a date that is not a day', slot({ date: 'next Wednesday' })],
    ['an empty answer', '']
  ].forEach(([label, reply]) => {
    it(`AC-23 ${label} is discarded with "The assistant could not suggest a slot"`, async () => {
      await assert.rejects(
        ask(answering(reply)),
        (err) => err instanceof UnusableAnswerError && err.message === 'The assistant could not suggest a slot'
      );
      assert.equal(bookingCount(), 0);
    });
  });

  it('AC-24 a provider that times out gives "The assistant is not answering, pick a lab and hour yourself"', async () => {
    await assert.rejects(
      ask(failing(new ProviderTimeoutError('timeout'))),
      (err) => err instanceof UnavailableError && err.message === 'The assistant is not answering, pick a lab and hour yourself'
    );
  });

  it('AC-24 a provider error and a missing client give the same sentence', async () => {
    await assert.rejects(ask(failing(new Error('boom'))), UnavailableError);
    await assert.rejects(suggestionService.suggestSlot('a lab please', { client: null, now: NOW }), UnavailableError);
  });

  it('AC-24 a rate-limited provider gives "The assistant is busy, try again in a minute"', async () => {
    await assert.rejects(
      ask(failing(new ProviderRateLimitError('429'))),
      (err) => err instanceof BusyError && err.message === 'The assistant is busy, try again in a minute'
    );
  });

  it('AC-25 an empty or too long request is refused before the model is called', async () => {
    const client = answering(slot());
    await assert.rejects(ask(client, '   '), ValidationError);
    await assert.rejects(ask(client, null), ValidationError);
    await assert.rejects(ask(client, 'x'.repeat(501)), ValidationError);
    assert.equal(client.prompts.length, 0);
  });

  describe('the real client, driven by a fake fetch', () => {
    const geminiWith = (fetchImpl) => createGeminiClient({ apiKey: 'test-key', model: 'test-model', timeoutMs: 50, fetchImpl });
    const respond = (status, body) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => body });

    it('AC-22 reads the text of the first candidate and sends the key in a header, not in the URL', async () => {
      let seen;
      const client = geminiWith(async (url, options) => {
        seen = { url, options };
        return { status: 200, ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }) };
      });
      assert.equal(await client.generate('hello'), '{"ok":true}');
      assert.doesNotMatch(seen.url, /test-key/);
      assert.equal(seen.options.headers['x-goog-api-key'], 'test-key');
      assert.ok(seen.options.signal, 'every call carries a timeout signal');
    });

    it('AC-24 a timeout becomes ProviderTimeoutError, HTTP 429 ProviderRateLimitError, any other failure a plain error', async () => {
      const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
      await assert.rejects(geminiWith(async () => { throw timeout; }).generate('x'), ProviderTimeoutError);
      await assert.rejects(geminiWith(respond(429, {})).generate('x'), ProviderRateLimitError);
      await assert.rejects(geminiWith(respond(500, {})).generate('x'), (e) => !(e instanceof ProviderTimeoutError) && !(e instanceof ProviderRateLimitError));
      await assert.rejects(geminiWith(async () => { throw new Error('offline'); }).generate('x'), Error);
    });

    it('AC-23 a response without any text comes back as an empty string', async () => {
      assert.equal(await geminiWith(respond(200, { candidates: [] })).generate('x'), '');
    });
  });
});
