from pathlib import Path
import sqlite3
db=sqlite3.connect(":memory:")
db.row_factory=sqlite3.Row
db.executescript(Path("gmail-archive-oauth/migrations/0001_oauth_storage.sql").read_text())
state="a"*64
db.execute("INSERT INTO oauth_sessions(state_hash,verifier_ciphertext,created_at,expires_at) VALUES(?,?,?,?)",(state,"fictional-encrypted-verifier",100,700))
q="UPDATE oauth_sessions SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL AND expires_at>? RETURNING verifier_ciphertext,created_at,expires_at"
first=db.execute(q,(200,state,200)).fetchone()
assert first and first["verifier_ciphertext"]=="fictional-encrypted-verifier"
assert db.execute(q,(201,state,201)).fetchone() is None
expired="b"*64
db.execute("INSERT INTO oauth_sessions(state_hash,verifier_ciphertext,created_at,expires_at) VALUES(?,?,?,?)",(expired,"fictional",100,150))
assert db.execute(q,(200,expired,200)).fetchone() is None
print("PASS: atomic SQLite UPDATE RETURNING rejects replay and expired sessions")
print("No live D1 or Google authorization requests performed")
