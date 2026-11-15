const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/data/db');
const { applySchemaAndSeed } = require('../db/init');

const FUTURE = '2099-01-15'; // far enough that the real clock does not matter

describe('Slice 2: bookings API', () => {
  let agent;

  beforeEach(async () => {
    applySchemaAndSeed(db);
    db.prepare('DELETE FROM bookings').run();
    agent = request.agent(app);
    await agent.post('/login').send({ email: 'student@example.com', password: 'password123' });
  });

  const rows = () => db.prepare('SELECT * FROM bookings').all();
  const book = (body, who = agent) => who.post('/api/bookings').send(body);

  it('AC-14 a visitor who is not signed in gets 401 and no row is added', async () => {
    const res = await book({ workstationId: 1, date: FUTURE, hour: 10 }, request(app));
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'You must be signed in' });
    assert.equal(rows().length, 0);
  });

  it('AC-14 a visitor who is not signed in gets 401 for GET /api/bookings', async () => {
    const res = await request(app).get('/api/bookings');
    assert.equal(res.status, 401);
  });

  it('AC-2 a student who books a free workstation gets 201, one active row with their user id, and sees it in the list', async () => {
    const res = await book({ workstationId: 1, date: FUTURE, hour: 10 });
    assert.equal(res.status, 201);

    const student = db.prepare("SELECT id FROM users WHERE email = 'student@example.com'").get();
    const all = rows();
    assert.equal(all.length, 1);
    assert.equal(all[0].user_id, student.id);
    assert.equal(all[0].status, 'active');
    assert.equal(all[0].workstation_id, 1);
    assert.equal(all[0].date, FUTURE);
    assert.equal(all[0].hour, 10);

    const list = await agent.get('/api/bookings');
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].id, all[0].id);
    assert.equal(list.body[0].lab, 'Computer Lab 1');
  });

  it('AC-2 hour and workstation sent as text (HTML form) are accepted', async () => {
    const res = await book({ workstationId: '1', date: FUTURE, hour: '11' });
    assert.equal(res.status, 201);
    assert.equal(rows().length, 1);
  });

  it('AC-2 the list shows only the signed-in student\'s own bookings', async () => {
    db.prepare("INSERT INTO bookings (user_id, workstation_id, date, hour, status) VALUES (2, 3, ?, 9, 'active')").run(FUTURE);
    const list = await agent.get('/api/bookings');
    assert.equal(list.status, 200);
    assert.equal(list.body.length, 0);
  });

  it('AC-1 booking an hour that is taken returns 409 "This slot is taken" and adds no row', async () => {
    await book({ workstationId: 1, date: FUTURE, hour: 10 });
    const res = await book({ workstationId: 1, date: FUTURE, hour: 10 });
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: 'This slot is taken' });
    assert.equal(rows().length, 1);
  });

  it('AC-6 a fourth active future booking returns 409 "Booking limit reached (3)"', async () => {
    for (const hour of [10, 11, 12]) {
      assert.equal((await book({ workstationId: 1, date: FUTURE, hour })).status, 201);
    }
    const res = await book({ workstationId: 1, date: FUTURE, hour: 13 });
    assert.equal(res.status, 409);
    assert.deepEqual(res.body, { error: 'Booking limit reached (3)' });
    assert.equal(rows().length, 3);
  });

  it('AC-5 a booking in the past returns 400 with a readable sentence and adds no row', async () => {
    const res = await book({ workstationId: 1, date: '2000-01-01', hour: 10 });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: 'You cannot book a time in the past' });
    assert.equal(rows().length, 0);
  });

  it('AC-15 a workstation that does not exist returns 404 and adds no row', async () => {
    const res = await book({ workstationId: 99999, date: FUTURE, hour: 10 });
    assert.equal(res.status, 404);
    assert.equal(typeof res.body.error, 'string');
    assert.equal(rows().length, 0);
  });

  it('AC-16 an hour outside 08:00-20:00 returns 400 naming the allowed hours and adds no row', async () => {
    const res = await book({ workstationId: 1, date: FUTURE, hour: 21 });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /08:00-20:00/);
    assert.equal(rows().length, 0);
  });

  it('AC-16 a missing hour returns 400 and adds no row', async () => {
    const res = await book({ workstationId: 1, date: FUTURE });
    assert.equal(res.status, 400);
    assert.equal(rows().length, 0);
  });

  describe('cancelling', () => {
    let otherAgent;

    beforeEach(async () => {
      otherAgent = request.agent(app);
      await otherAgent.post('/login').send({ email: 'staff@example.com', password: 'admin123' });
    });

    it('AC-3 a student who cancels their own booking gets 204, the row is cancelled and the list no longer shows it', async () => {
      const created = await book({ workstationId: 1, date: FUTURE, hour: 10 });
      const res = await agent.delete(`/api/bookings/${created.body.id}`);
      assert.equal(res.status, 204);
      assert.equal(db.prepare('SELECT status FROM bookings WHERE id = ?').get(created.body.id).status, 'cancelled');
      assert.equal((await agent.get('/api/bookings')).body.length, 0);
    });

    it('AC-4 a student who cancels another student\'s booking gets 403 and the row is unchanged', async () => {
      const hash = db.prepare("SELECT password_hash FROM users WHERE email = 'student@example.com'").get().password_hash;
      db.prepare("DELETE FROM users WHERE email = 'second@example.com'").run();
      db.prepare("INSERT INTO users (email, password_hash, role) VALUES ('second@example.com', ?, 'student')").run(hash);
      const second = request.agent(app);
      await second.post('/login').send({ email: 'second@example.com', password: 'password123' });

      const created = await book({ workstationId: 1, date: FUTURE, hour: 10 });
      const before = db.prepare('SELECT * FROM bookings WHERE id = ?').get(created.body.id);

      const res = await second.delete(`/api/bookings/${created.body.id}`);
      assert.equal(res.status, 403);
      assert.deepEqual(res.body, { error: 'You can only cancel your own bookings' });
      assert.deepEqual(db.prepare('SELECT * FROM bookings WHERE id = ?').get(created.body.id), before);
    });

    it('AC-4 a visitor who is not signed in gets 401 and the row is unchanged', async () => {
      const created = await book({ workstationId: 1, date: FUTURE, hour: 10 });
      const res = await request(app).delete(`/api/bookings/${created.body.id}`);
      assert.equal(res.status, 401);
      assert.equal(db.prepare('SELECT status FROM bookings WHERE id = ?').get(created.body.id).status, 'active');
    });

    it('AC-4 a staff member may cancel a student\'s booking', async () => {
      const created = await book({ workstationId: 1, date: FUTURE, hour: 10 });
      const res = await otherAgent.delete(`/api/bookings/${created.body.id}`);
      assert.equal(res.status, 204);
    });

    it('AC-4 cancelling a booking that does not exist, or with a bad id, returns 404', async () => {
      assert.equal((await agent.delete('/api/bookings/99999')).status, 404);
      assert.equal((await agent.delete('/api/bookings/abc')).status, 404);
    });
  });
});
