import sqlite3
from pathlib import Path
db=sqlite3.connect(":memory:")
db.executescript(Path("gmail-archive-oauth/migrations/0002_admin_sessions.sql").read_text())
db.execute("INSERT INTO admin_sessions(session_hash,admin_subject,admin_email,csrf_hash,created_at,expires_at) VALUES(?,?,?,?,?,?)",("a"*64,"fictional-sub","admin@zyenhomes.com","b"*64,100,1000))
assert db.execute("SELECT count(*) FROM admin_sessions WHERE revoked_at IS NULL AND expires_at>?",(200,)).fetchone()[0]==1
assert db.execute("UPDATE admin_sessions SET revoked_at=? WHERE session_hash=? AND revoked_at IS NULL",(200,"a"*64)).rowcount==1
assert db.execute("UPDATE admin_sessions SET revoked_at=? WHERE session_hash=? AND revoked_at IS NULL",(201,"a"*64)).rowcount==0
try:
 db.execute("INSERT INTO admin_sessions(session_hash,admin_subject,admin_email,csrf_hash,created_at,expires_at) VALUES(?,?,?,?,?,?)",("c"*64,"fake","info@zyenhomes.com","d"*64,100,1000))
 raise AssertionError("Non-admin mailbox accepted")
except sqlite3.IntegrityError:pass
print("PASS: synthetic administrator session schema, revocation and admin mailbox restriction")
