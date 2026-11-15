const db = require('./db');

function insert(userId, workstationId, date, hour) {
  const info = db
    .prepare("INSERT INTO bookings (user_id, workstation_id, date, hour, status) VALUES (?, ?, ?, ?, 'active')")
    .run(userId, workstationId, date, hour);
  return findById(info.lastInsertRowid);
}

function findById(id) {
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
}

function findActiveBySlot(workstationId, date, hour) {
  return db
    .prepare("SELECT * FROM bookings WHERE workstation_id = ? AND date = ? AND hour = ? AND status = 'active'")
    .get(workstationId, date, hour);
}

// Active bookings of one user that start at or after the given day and hour.
function countActiveFromSlot(userId, date, hour) {
  return db
    .prepare(
      `SELECT COUNT(*) AS n FROM bookings
       WHERE user_id = ? AND status = 'active' AND (date > ? OR (date = ? AND hour >= ?))`
    )
    .get(userId, date, date, hour).n;
}

function findActiveByUser(userId) {
  return db
    .prepare(
      `SELECT b.id, b.date, b.hour, b.status, w.name AS workstation, l.name AS lab, l.room
       FROM bookings b
       JOIN workstations w ON w.id = b.workstation_id
       JOIN labs l ON l.id = w.lab_id
       WHERE b.user_id = ? AND b.status = 'active'
       ORDER BY b.date, b.hour`
    )
    .all(userId);
}

function setStatus(id, status) {
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
}

function findAll() {
  return db
    .prepare(
      `SELECT b.id, u.email, b.date, b.hour, b.status, w.name AS workstation, l.name AS lab
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN workstations w ON w.id = b.workstation_id
       JOIN labs l ON l.id = w.lab_id
       ORDER BY b.date, b.hour, l.name, w.id`
    )
    .all();
}

module.exports = { findAll, setStatus, insert, findById, findActiveBySlot, countActiveFromSlot, findActiveByUser };
