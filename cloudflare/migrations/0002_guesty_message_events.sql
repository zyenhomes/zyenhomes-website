-- Guesty message archive; no booking or guest records are modified.
CREATE TABLE IF NOT EXISTS guesty_message_events (
  svix_id TEXT PRIMARY KEY,
  guesty_event_id TEXT,
  event_type TEXT NOT NULL CHECK(event_type IN ('reservation.messageReceived','reservation.messageSent')),
  reservation_id TEXT NOT NULL,
  conversation_id TEXT,
  occurred_at TEXT,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  payload_json TEXT NOT NULL,
  archive_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_guesty_message_event_id ON guesty_message_events(guesty_event_id) WHERE guesty_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guesty_message_reservation ON guesty_message_events(reservation_id,occurred_at);
