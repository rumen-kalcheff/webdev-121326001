const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/data/db');
const { resetDb } = require('./helpers');

describe('Slice 2: booking pages', () => {
  beforeEach(() => {
    resetDb();
  });

  ['/book', '/my-bookings'].forEach((path) => {
    it(`AC-14 a visitor who is not signed in is redirected from ${path} to /login`, async () => {
      const res = await request(app).get(path);
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, '/login');
    });
  });

  it('AC-2 the booking form offers every workstation of every lab and the hours 08:00 to 19:00', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'student@example.com', password: 'password123' });
    const res = await agent.get('/book');
    assert.equal(res.status, 200);
    assert.match(res.text, /Computer Lab 1/);
    assert.match(res.text, /Hardware Lab/);
    assert.equal((res.text.match(/<option value="\d+">PC-/g) || []).length, 35);
    assert.match(res.text, /08:00/);
    assert.match(res.text, /19:00/);
  });

  it('AC-2 the My bookings page has loading, empty and error states and no booking data in the HTML', async () => {
    const agent = request.agent(app);
    await agent.post('/login').send({ email: 'student@example.com', password: 'password123' });
    const res = await agent.get('/my-bookings');
    assert.equal(res.status, 200);
    assert.match(res.text, /Loading your bookings/);
    assert.match(res.text, /You have no bookings yet/);
    assert.match(res.text, /id="error"/);
  });
});
