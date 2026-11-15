const db = require('../src/data/db');
const { applySchemaAndSeed } = require('../db/init');

// Back to the seed data: two users, two labs, 35 workstations, no bookings.
// Tests share one in-memory database, so each file starts from here instead of
// relying on what the previous file left behind.
function resetDb() {
  applySchemaAndSeed(db);
  db.prepare('DELETE FROM bookings').run();
  db.prepare('DELETE FROM labs').run();
  db.prepare('DELETE FROM users').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('bookings', 'workstations', 'labs', 'users')").run();
  applySchemaAndSeed(db);
}

module.exports = { resetDb };
