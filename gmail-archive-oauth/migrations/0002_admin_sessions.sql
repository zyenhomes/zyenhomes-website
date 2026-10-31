-- Separate Gmail OAuth database only. One-time admin sessions.
CREATE TABLE IF NOT EXISTS admin_sessions (
  session_hash TEXT PRIMARY KEY,
  admin_subject TEXT NOT NULL,
  admin_email TEXT NOT NULL CHECK(admin_email='admin@zyenhomes.com'),
  csrf_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK(expires_at > created_at),
  CHECK(expires_at - created_at <= 900)
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
