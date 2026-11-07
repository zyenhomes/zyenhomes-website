-- Add provenance for the exact Guesty quote used to price a booking request.
-- Apply only after explicit production approval; repository merge does not run this migration.
ALTER TABLE booking_requests ADD COLUMN guesty_quote_id TEXT;
CREATE INDEX IF NOT EXISTS idx_booking_requests_guesty_quote_id
  ON booking_requests(guesty_quote_id)
  WHERE guesty_quote_id IS NOT NULL;
