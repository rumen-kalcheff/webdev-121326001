const db = require('./db');

function findById(id) {
  return db.prepare('SELECT * FROM workstations WHERE id = ?').get(id);
}

module.exports = { findById };
