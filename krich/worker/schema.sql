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

-- 회원 계정 (이메일 + 비밀번호)
CREATE TABLE IF NOT EXISTS accounts (
  email       TEXT PRIMARY KEY,          -- 소문자 정규화
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  pw_hash     TEXT NOT NULL,             -- PBKDF2-SHA256, base64
  pw_salt     TEXT NOT NULL,             -- base64
  created_at  TEXT NOT NULL,
  last_login  TEXT
);
-- 예약에 회원 연결
ALTER TABLE bookings ADD COLUMN account_email TEXT;
CREATE INDEX IF NOT EXISTS idx_bookings_account ON bookings(account_email);

-- 이메일 인증 (accounts 확장)
-- verified: 0 미인증, 1 인증 완료
-- code_hash/code_expires/code_tries/code_sent_at: 6자리 인증 코드 상태
