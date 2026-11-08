-- PREPARATION ONLY: do not apply to production without explicit approval.
-- Persist a stable client submission key and server-computed payload fingerprint.
-- Existing requests may have NULL values; the partial unique index allows that.
ALTER TABLE booking_requests ADD COLUMN request_idempotency_key TEXT;
ALTER TABLE booking_requests ADD COLUMN request_payload_fingerprint TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_requests_idempotency_key
  ON booking_requests(request_idempotency_key)
  WHERE request_idempotency_key IS NOT NULL;
