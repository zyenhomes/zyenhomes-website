"""Offline SQLite review only; never connects to production D1."""
from pathlib import Path
import sqlite3

db = sqlite3.connect(":memory:")
db.executescript(Path("cloudflare/migrations/0001_booking_requests.sql").read_text())
db.executescript(Path("cloudflare/migrations/0002_guesty_message_events.sql").read_text())
db.executescript(Path("cloudflare/migrations/0002_guesty_message_events.sql").read_text())
cols = {row[1] for row in db.execute("PRAGMA table_info(guesty_message_events)")}
required = {"svix_id","guesty_event_id","event_type","reservation_id","conversation_id","occurred_at","received_at","payload_json","archive_status"}
assert required <= cols, required-cols
sql = """INSERT OR IGNORE INTO guesty_message_events
(svix_id,guesty_event_id,event_type,reservation_id,conversation_id,occurred_at,payload_json)
VALUES (?,?,?,?,?,?,?)"""
row = ("msg_test","event_test","reservation.messageReceived","reservation_test","conversation_test","2026-10-28T12:00:00Z",'{"synthetic":true}')
db.execute(sql,row)
db.execute(sql,row)
db.execute(sql,("msg_retry","event_test",*row[2:]))
assert db.execute("SELECT COUNT(*) FROM guesty_message_events").fetchone()[0] == 1
db.execute(sql,("msg_second","event_second","reservation.messageSent","reservation_test","conversation_test","2026-10-28T11:00:00Z",'{"synthetic":true}'))
ordered = [r[0] for r in db.execute("SELECT svix_id FROM guesty_message_events ORDER BY occurred_at, received_at")]
assert ordered == ["msg_second","msg_test"], ordered
before = db.execute("SELECT COUNT(*) FROM guesty_message_events").fetchone()[0]
db.execute(sql,("msg_invalid","event_invalid","reservation.deleted","reservation_test",None,None,"{}"))
after = db.execute("SELECT COUNT(*) FROM guesty_message_events").fetchone()[0]
assert after == before, "Unexpected event was stored"
assert db.execute("SELECT COUNT(*) FROM booking_requests").fetchone()[0] == 0
assert db.execute("SELECT COUNT(*) FROM guesty_message_events").fetchone()[0] == 2
print("PASS: archive migration repeatable, schema correct, deduplication and ordering verified; booking table unchanged.")
