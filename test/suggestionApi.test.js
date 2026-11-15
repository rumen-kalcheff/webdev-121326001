const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/data/db');
const { resetDb } = require('./helpers');
const assistant = require('../src/ai/assistant');
const { ProviderTimeoutError, ProviderRateLimitError } = assistant;

// Fake clients only: no test in this file reaches a model provider.
const answering = (reply) => ({ calls: 0, async generate() { this.calls++; return reply; } });
const failing = (error) => ({ calls: 0, async generate() { this.calls++; throw error; } });
const good = JSON.stringify({ lab: 'Hardware Lab', date: '2099-01-14', hour: 15 });

describe('Slice 4: POST /api/suggestions', () => {
  let agent;

  beforeEach(async () => {
    resetDb();
    agent = request.agent(app);
    await agent.post('/login').send({ email: 'student@example.com', password: 'password123' });
  });

  afterEach(() => assistant.useClient(undefined));

  const bookingCount = () => db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n;
  const ask = (text = '15 computers on Wednesday afternoon') => agent.post('/api/suggestions').send({ text });

  it('AC-22 a good answer returns 200 with one lab, date, hour and the label "Suggestion", and no booking exists', async () => {
    assistant.useClient(answering(good));
    const res = await ask();
    assert.equal(res.status, 200);
    assert.equal(res.body.label, 'Suggestion');
    assert.equal(res.body.lab.name, 'Hardware Lab');
    assert.equal(res.body.date, '2099-01-14');
    assert.equal(res.body.hour, 15);
    assert.equal(bookingCount(), 0);
  });

  it('AC-23 an answer that is not usable returns 422 "The assistant could not suggest a slot"', async () => {
    assistant.useClient(answering('I would pick Tuesday'));
    const res = await ask();
    assert.equal(res.status, 422);
    assert.deepEqual(res.body, { error: 'The assistant could not suggest a slot' });
    assert.equal(bookingCount(), 0);
  });

  it('AC-24 a timeout returns 503 and a rate limit returns 429 with their sentences', async () => {
    assistant.useClient(failing(new ProviderTimeoutError('t')));
    const slow = await ask();
    assert.equal(slow.status, 503);
    assert.deepEqual(slow.body, { error: 'The assistant is not answering, pick a lab and hour yourself' });

    assistant.useClient(failing(new ProviderRateLimitError('r')));
    const busy = await ask();
    assert.equal(busy.status, 429);
    assert.deepEqual(busy.body, { error: 'The assistant is busy, try again in a minute' });
  });

  it('AC-24 without a key the assistant is down but the booking form still works', async () => {
    assistant.useClient(null);
    assert.equal((await ask()).status, 503);
    const page = await agent.get('/book');
    assert.equal(page.status, 200);
    assert.match(page.text, /id="book-form"/);
  });

  it('AC-25 a visitor who is not signed in gets 401 and the model is not called', async () => {
    const client = answering(good);
    assistant.useClient(client);
    const res = await request(app).post('/api/suggestions').send({ text: 'a lab' });
    assert.equal(res.status, 401);
    assert.equal(client.calls, 0);
  });

  it('AC-25 an empty request gets 400 and the model is not called', async () => {
    const client = answering(good);
    assistant.useClient(client);
    const res = await ask('   ');
    assert.equal(res.status, 400);
    assert.equal(client.calls, 0);
  });
});
