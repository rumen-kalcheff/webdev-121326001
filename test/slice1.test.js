const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/data/db');
const { applySchemaAndSeed } = require('../db/init');

describe('Slice 1: Authentication and Labs List', () => {
  beforeEach(() => {
    applySchemaAndSeed(db);
    db.prepare('DELETE FROM labs').run();
    db.prepare('DELETE FROM users').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('labs', 'users')").run();
    applySchemaAndSeed(db);
  });

  describe('AC-10: Authentication Guard', () => {
    it('AC-10 a visitor who is not signed in is redirected from /labs to /login', async () => {
      const res = await request(app).get('/labs');
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, '/login');
    });

    it('AC-10 a visitor who is not signed in gets 401 for /api/labs', async () => {
      const res = await request(app).get('/api/labs');
      assert.equal(res.status, 401);
      assert.deepEqual(res.body, { error: 'You must be signed in' });
    });

    it('AC-10 a signed in user visiting /login is redirected to /labs', async () => {
      const agent = request.agent(app);
      await agent
        .post('/login')
        .send({ email: 'student@example.com', password: 'password123' });

      const res = await agent.get('/login');
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, '/labs');
    });

    it('AC-10 logout destroys session and /labs redirects to /login', async () => {
      const agent = request.agent(app);
      await agent
        .post('/login')
        .send({ email: 'student@example.com', password: 'password123' });

      const logoutRes = await agent.get('/logout');
      assert.equal(logoutRes.status, 302);
      assert.equal(logoutRes.headers.location, '/login');

      const labsRes = await agent.get('/labs');
      assert.equal(labsRes.status, 302);
      assert.equal(labsRes.headers.location, '/login');
    });
  });

  describe('AC-11: Sign-in and Labs List', () => {
    it('AC-11 a user who signs in sees every lab with name, room, and workstation counts', async () => {
      const agent = request.agent(app);
      
      const loginRes = await agent
        .post('/login')
        .send({ email: 'student@example.com', password: 'password123' });
      
      assert.equal(loginRes.status, 302);
      assert.equal(loginRes.headers.location, '/labs');

      const labsRes = await agent.get('/labs');
      assert.equal(labsRes.status, 200);
      assert.match(labsRes.text, /Computer Lab 1/);
      assert.match(labsRes.text, /Hardware Lab/);
      assert.match(labsRes.text, /<td>20<\/td>/);
      assert.match(labsRes.text, /<td>15<\/td>/);
    });

    it('AC-11 a user who signs in gets labs JSON via API', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/login')
        .set('Accept', 'application/json')
        .send({ email: 'student@example.com', password: 'password123' });

      const labsRes = await agent.get('/api/labs');
      assert.equal(labsRes.status, 200);
      assert.equal(labsRes.body.length, 2);
      assert.equal(labsRes.body[0].name, 'Computer Lab 1');
      assert.equal(labsRes.body[0].workstation_count, 20);
    });
  });

  describe('AC-12: Failed login', () => {
    it('AC-12 a user who signs in with a wrong password sees Wrong email or password with 401', async () => {
      const agent = request.agent(app);
      
      const loginRes = await agent
        .post('/login')
        .send({ email: 'student@example.com', password: 'wrongpassword' });
      
      assert.equal(loginRes.status, 401);
      assert.match(loginRes.text, /Wrong email or password/);
      const after = await agent.get("/labs");
      assert.equal(after.status, 302);
      assert.equal(after.headers.location, "/login");
    });

    it('AC-12 a user who signs in with an unknown email sees Wrong email or password with 401', async () => {
      const agent = request.agent(app);
      
      const loginRes = await agent
        .post('/login')
        .send({ email: 'unknown@example.com', password: 'password123' });
      
      assert.equal(loginRes.status, 401);
      assert.match(loginRes.text, /Wrong email or password/);
      const after = await agent.get("/labs");
      assert.equal(after.status, 302);
      assert.equal(after.headers.location, "/login");
    });

    it('AC-12 a user who submits empty body sees Wrong email or password with 401', async () => {
      const agent = request.agent(app);
      
      const loginRes = await agent
        .post('/login')
        .send({});
      
      assert.equal(loginRes.status, 401);
      assert.match(loginRes.text, /Wrong email or password/);
      const after = await agent.get("/labs");
      assert.equal(after.status, 302);
      assert.equal(after.headers.location, "/login");
    });
  });

  describe('AC-13: Database synchronization', () => {
    it('AC-13 after a row is deleted from labs, reloading /labs no longer shows that lab', async () => {
      const agent = request.agent(app);
      
      await agent
        .post('/login')
        .send({ email: 'student@example.com', password: 'password123' });

      let labsRes = await agent.get('/labs');
      assert.match(labsRes.text, /Computer Lab 1/);

      db.prepare("DELETE FROM labs WHERE name = 'Computer Lab 1'").run();

      labsRes = await agent.get('/labs');
      assert.doesNotMatch(labsRes.text, /Computer Lab 1/);
      assert.match(labsRes.text, /Hardware Lab/);
    });
  });
});
