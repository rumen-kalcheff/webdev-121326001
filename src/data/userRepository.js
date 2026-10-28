const db = require('./db');

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

module.exports = {
  findByEmail
};
