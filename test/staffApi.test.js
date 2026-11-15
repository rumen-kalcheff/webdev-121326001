const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/data/db');
const { resetDb } = require('./helpers');

const FUTURE = '2099-01-15';

describe('Slice 3: staff API and pages', () => {
  let student;
  let staff;
  let w1;

  beforeEach(async () => {
    resetDb();
    db.prepare('DELETE FROM bookings').run();
    db.prepare("DELETE FROM labs WHERE name = 'API Lab'").run();
    db.prepare('UPDATE workstations SET in_service = 1').run();
    w1 = db.prepare('SELECT id FROM workstations ORDER BY id LIMIT 1').get().id;
    student = request.agent(app);
    staff = request.agent(app);
    await student.post('/login').send({ email: 'student@example.com', password: 'password123' });
    await staff.post('/login').send({ email: 'staff@example.com', password: 'admin123' });
  });

  const labCount = () => db.prepare('SELECT COUNT(*) AS n FROM labs').get().n;

  it('AC-7 a staff member opens All bookings and sees the bookings of every student', async () => {
    await student.post('/api/bookings').send({ workstationId: w1, date: FUTURE, hour: 10 });
    const page = await staff.get('/all-bookings');
    assert.equal(page.status, 200);
    assert.match(page.text, /student@example\.com/);
    assert.match(page.text, /Computer Lab 1/);
    const api = await staff.get('/api/all-bookings');
    assert.equal(api.status, 200);
    assert.equal(api.body.length, 1);
  });

  it('AC-7 a student who requests All bookings gets 403, for the page and for the API', async () => {
    assert.equal((await student.get('/all-bookings')).status, 403);
    assert.equal((await student.get('/api/all-bookings')).status, 403);
  });

  it('AC-7 a visitor who is not signed in is redirected from All bookings to /login and gets 401 from the API', async () => {
    const page = await request(app).get('/all-bookings');
    assert.equal(page.status, 302);
    assert.equal(page.headers.location, '/login');
    assert.equal((await request(app).get('/api/all-bookings')).status, 401);
  });

  it('AC-8 a staff member who adds a lab gets 201, sees it in the labs list, and one row is added', async () => {
    const before = labCount();
    const res = await staff.post('/api/labs').send({ name: 'API Lab', room: 'Room 404', workstationCount: 3 });
    assert.equal(res.status, 201);
    assert.equal(labCount(), before + 1);
    const list = await staff.get('/api/labs');
    assert.ok(list.body.some((l) => l.name === 'API Lab' && l.workstation_count === 3));
  });

  it('AC-8 a student who sends the same request gets 403 and no row is added', async () => {
    const before = labCount();
    const res = await student.post('/api/labs').send({ name: 'API Lab', room: 'Room 404', workstationCount: 3 });
    assert.equal(res.status, 403);
    assert.equal(labCount(), before);
  });

  it('AC-8 a visitor who is not signed in gets 401 and no row is added', async () => {
    const before = labCount();
    const res = await request(app).post('/api/labs').send({ name: 'API Lab', room: 'Room 404', workstationCount: 3 });
    assert.equal(res.status, 401);
    assert.equal(labCount(), before);
  });

  it('AC-8 invalid lab data gets 400 and no row is added', async () => {
    const before = labCount();
    const res = await staff.post('/api/labs').send({ name: '', room: 'Room 404', workstationCount: 3 });
    assert.equal(res.status, 400);
    assert.equal(labCount(), before);
  });

  it('AC-9 a staff member marks a workstation out of service, and a booking request for it returns 409', async () => {
    const res = await staff.patch(`/api/workstations/${w1}`).send({ inService: false });
    assert.equal(res.status, 200);
    assert.equal(db.prepare('SELECT in_service FROM workstations WHERE id = ?').get(w1).in_service, 0);

    const form = await student.get('/book');
    assert.equal((form.text.match(/<option value="\d+">PC-/g) || []).length, 34);

    const booking = await student.post('/api/bookings').send({ workstationId: w1, date: FUTURE, hour: 10 });
    assert.equal(booking.status, 409);
    assert.match(booking.body.error, /out of service/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n, 0);
  });

  it('AC-9 a student who changes a workstation status gets 403 and the row is unchanged', async () => {
    const res = await student.patch(`/api/workstations/${w1}`).send({ inService: false });
    assert.equal(res.status, 403);
    assert.equal(db.prepare('SELECT in_service FROM workstations WHERE id = ?').get(w1).in_service, 1);
  });

  it('AC-9 an unknown workstation gets 404, a visitor gets 401, a bad status gets 400', async () => {
    assert.equal((await staff.patch('/api/workstations/99999').send({ inService: false })).status, 404);
    assert.equal((await request(app).patch(`/api/workstations/${w1}`).send({ inService: false })).status, 401);
    assert.equal((await staff.patch(`/api/workstations/${w1}`).send({ inService: 'maybe' })).status, 400);
  });

  it('AC-8 the Manage page is for staff: a student gets 403 and staff see every lab with its workstations', async () => {
    assert.equal((await student.get('/manage')).status, 403);
    const page = await staff.get('/manage');
    assert.equal(page.status, 200);
    assert.match(page.text, /Computer Lab 1/);
    assert.match(page.text, /PC-1/);
  });
});
