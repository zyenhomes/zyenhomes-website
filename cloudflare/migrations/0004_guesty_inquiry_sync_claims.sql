-- PREPARATION ONLY. Never apply to production without separate explicit approval.
-- A claim token is unique to one worker attempt; uncertain attempts require reconciliation.
ALTER TABLE booking_requests ADD COLUMN guesty_sync_claim_token TEXT;
ALTER TABLE booking_requests ADD COLUMN guesty_sync_claimed_at TEXT;
ALTER TABLE booking_requests ADD COLUMN guesty_sync_attempt_count INTEGER NOT NULL DEFAULT 0
  CHECK (guesty_sync_attempt_count >= 0);
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_guesty_sync_claim_token
  ON booking_requests(guesty_sync_claim_token)
  WHERE guesty_sync_claim_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS guesty_inquiry_sync_attempts (
  attempt_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES booking_requests(request_id),
  claim_token TEXT NOT NULL UNIQUE,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT,
  outcome TEXT NOT NULL DEFAULT 'processing'
    CHECK (outcome IN ('processing','succeeded','failed','uncertain','manual_review')),
  guesty_reference TEXT,
  error_category TEXT
);
CREATE INDEX IF NOT EXISTS idx_guesty_sync_attempts_request
  ON guesty_inquiry_sync_attempts(request_id,started_at);

-- This migration intentionally does not create any triggers, jobs, or Guesty requests.
