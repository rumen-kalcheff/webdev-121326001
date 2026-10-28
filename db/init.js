const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function applySchemaAndSeed(db) {
  // 1. Schema
  const schemaPath = path.join(__dirname, 'migrations/001_initial_schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // 2. Seeds (only if empty)
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const saltRounds = 10;
    const studentHash = bcrypt.hashSync('password123', saltRounds);
    const staffHash = bcrypt.hashSync('admin123', saltRounds);

    const insertUser = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
    insertUser.run('student@example.com', studentHash, 'student');
    insertUser.run('staff@example.com', staffHash, 'staff');
  }

  const labCount = db.prepare('SELECT COUNT(*) as count FROM labs').get().count;
  if (labCount === 0) {
    const insertLab = db.prepare('INSERT INTO labs (name, room, workstation_count) VALUES (?, ?, ?)');
    insertLab.run('Computer Lab 1', 'Room 101', 20);
    insertLab.run('Hardware Lab', 'Room 202', 15);
  }
}

if (require.main === module) {
  const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../lab_booking.db');
  const db = new Database(DB_PATH);
  try {
    applySchemaAndSeed(db);
    console.log('Database initialized successfully at', DB_PATH);
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

module.exports = { applySchemaAndSeed };
