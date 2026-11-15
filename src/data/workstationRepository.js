const db = require('./db');

function findById(id) {
  return db.prepare('SELECT * FROM workstations WHERE id = ?').get(id);
}

function findAll() {
  return db.prepare('SELECT id, lab_id, name FROM workstations ORDER BY lab_id, id').all();
}

module.exports = { findById, findAll };
