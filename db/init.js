const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function applyMigrations(db) {
  // Schema: every migration that has not run yet, in numbered order.
  // 001 and 002 were written to be repeatable and run once more on a database that predates
  // this table; 003 and later run exactly once.
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
  const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((row) => row.name));
  const migrationsDir = path.join(__dirname, 'migrations');
  fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && !applied.has(file))
    .sort()
    .forEach((file) => {
      db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
    });
}

function applySchemaAndSeed(db) {
  applyMigrations(db);

  // Seeds (only if empty)
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

  const workstationCount = db.prepare('SELECT COUNT(*) as count FROM workstations').get().count;
  if (workstationCount === 0) {
    const insertWorkstation = db.prepare('INSERT INTO workstations (lab_id, name) VALUES (?, ?)');
    db.prepare('SELECT id, workstation_count FROM labs').all().forEach((lab) => {
      for (let n = 1; n <= lab.workstation_count; n++) {
        insertWorkstation.run(lab.id, `PC-${n}`);
      }
    });
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

module.exports = { applySchemaAndSeed, applyMigrations };
