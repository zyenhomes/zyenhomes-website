-- Zyen Homes: booking requests are operational records, not confirmed reservations.
CREATE TABLE IF NOT EXISTS booking_requests (
  request_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  property_id TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  quote_total_cents INTEGER NOT NULL,
  quote_currency TEXT NOT NULL DEFAULT 'CAD',
  request_status TEXT NOT NULL DEFAULT 'received',
  guesty_sync_status TEXT NOT NULL DEFAULT 'pending',
  guesty_reference TEXT,
  marketing_consent INTEGER NOT NULL DEFAULT 0 CHECK (marketing_consent IN (0,1)),
  marketing_consent_at TEXT,
  consent_text_version TEXT
);
CREATE INDEX IF NOT EXISTS idx_requests_created ON booking_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_email ON booking_requests(guest_email);
CREATE INDEX IF NOT EXISTS idx_requests_guesty_sync ON booking_requests(guesty_sync_status);
-- Only explicitly opted-in guests belong in marketing export.
CREATE VIEW IF NOT EXISTS marketing_opt_ins AS
 SELECT guest_name, guest_email, guest_phone, property_id, check_in, check_out, guests,
 marketing_consent_at, consent_text_version
 FROM booking_requests WHERE marketing_consent = 1;
