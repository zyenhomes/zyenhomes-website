-- Dedicated Gmail archive OAuth database; never apply to booking D1.
CREATE TABLE IF NOT EXISTS oauth_sessions (
  state_hash TEXT PRIMARY KEY,
  verifier_ciphertext TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expiry ON oauth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  mailbox TEXT PRIMARY KEY CHECK (mailbox = 'info@zyenhomes.com'),
  encrypted_refresh_token TEXT NOT NULL,
  token_key_version INTEGER NOT NULL DEFAULT 1,
  scope TEXT NOT NULL CHECK (scope = 'https://www.googleapis.com/auth/gmail.insert'),
  updated_at INTEGER NOT NULL
);
