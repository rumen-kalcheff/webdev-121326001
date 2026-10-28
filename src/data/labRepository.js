const db = require('./db');

function findAll() {
  return db.prepare('SELECT * FROM labs').all();
}

module.exports = {
  findAll
};
