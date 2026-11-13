-- K-RICH CLINIC 예약 테이블
CREATE TABLE IF NOT EXISTS bookings (
  code        TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL,
  updated_at  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending|confirmed|done|cancelled|noshow
  visit_date  TEXT NOT NULL,                     -- YYYY-MM-DD
  visit_time  TEXT NOT NULL,                     -- HH:MM
  visit_type  TEXT,                              -- first|repeat
  dose        REAL,
  pack        TEXT,
  receive     TEXT,
  extras      TEXT,                              -- JSON 배열
  mix         TEXT,
  total       INTEGER,
  name        TEXT, ename TEXT, birth TEXT, sex TEXT,
  phone       TEXT, contact TEXT,
  height      TEXT, weight TEXT,
  meds        TEXT, stay TEXT, fridge TEXT, prior TEXT,
  screening   TEXT,                              -- JSON 배열
  admin_note  TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_bookings_date   ON bookings(visit_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot   ON bookings(visit_date, visit_time);
