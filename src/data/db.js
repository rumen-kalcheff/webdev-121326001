const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { applySchemaAndSeed } = require('../../db/init');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../lab_booking.db');

const needsInit = DB_PATH === ':memory:' || !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);

if (needsInit) {
  applySchemaAndSeed(db);
}

module.exports = db;
