CREATE TABLE IF NOT EXISTS workstations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_id INTEGER NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workstation_id INTEGER NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 8 AND 19),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled'))
);

-- The database itself refuses a second active booking of the same workstation, day and hour.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
  ON bookings (workstation_id, date, hour)
  WHERE status = 'active';
