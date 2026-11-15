const db = require('./db');

function findAll() {
  return db.prepare('SELECT * FROM labs').all();
}

// A lab and its workstations go in together or not at all.
const insertWithWorkstations = db.transaction((name, room, workstationCount) => {
  const info = db
    .prepare('INSERT INTO labs (name, room, workstation_count) VALUES (?, ?, ?)')
    .run(name, room, workstationCount);
  const insertWorkstation = db.prepare('INSERT INTO workstations (lab_id, name) VALUES (?, ?)');
  for (let n = 1; n <= workstationCount; n++) {
    insertWorkstation.run(info.lastInsertRowid, `PC-${n}`);
  }
  return db.prepare('SELECT * FROM labs WHERE id = ?').get(info.lastInsertRowid);
});

module.exports = {
  findAll,
  insertWithWorkstations
};
