"""Offline SQLite verification of production migration uniqueness constraints."""
from pathlib import Path
import sqlite3
sql = Path("cloudflare/migrations/0002_guesty_message_events.sql").read_text()
db = sqlite3.connect(":memory:")
db.executescript(sql)
insert = """INSERT OR IGNORE INTO guesty_message_events
(svix_id, guesty_event_id, event_type, reservation_id, payload_json)
VALUES (?, ?, 'reservation.messageReceived', 'synthetic-reservation', '{}')"""
db.execute(insert, ("svix-synthetic-1", "event-synthetic-1"))
db.execute(insert, ("svix-synthetic-1", "event-synthetic-1"))
assert db.execute("SELECT COUNT(*) FROM guesty_message_events").fetchone()[0] == 1
db.execute(insert, ("svix-synthetic-2", "event-synthetic-1"))
assert db.execute("SELECT COUNT(*) FROM guesty_message_events").fetchone()[0] == 1
db.execute(insert, ("svix-synthetic-3", "event-synthetic-3"))
assert db.execute("SELECT COUNT(*) FROM guesty_message_events").fetchone()[0] == 2
print("PASS: SQLite primary key and unique Guesty event ID prevent duplicate archival.")
