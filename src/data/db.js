const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { applySchemaAndSeed, applyMigrations } = require('../../db/init');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../lab_booking.db');

const needsInit = DB_PATH === ':memory:' || !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);

if (needsInit) {
  applySchemaAndSeed(db);
} else {
  // An existing database file still gets every migration it has not run yet.
  applyMigrations(db);
}

module.exports = db;
