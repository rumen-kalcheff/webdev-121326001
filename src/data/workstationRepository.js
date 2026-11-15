const db = require('./db');

function findById(id) {
  return db.prepare('SELECT * FROM workstations WHERE id = ?').get(id);
}

function findAll({ onlyInService = false } = {}) {
  const where = onlyInService ? 'WHERE in_service = 1' : '';
  return db.prepare(`SELECT id, lab_id, name, in_service FROM workstations ${where} ORDER BY lab_id, id`).all();
}

function setInService(id, inService) {
  db.prepare('UPDATE workstations SET in_service = ? WHERE id = ?').run(inService ? 1 : 0, id);
  return findById(id);
}

module.exports = { findById, findAll, setInService };
