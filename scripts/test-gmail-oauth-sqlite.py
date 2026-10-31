from pathlib import Path
import sqlite3
sql = Path("gmail-archive-oauth/migrations/0001_oauth_storage.sql").read_text()
db = sqlite3.connect(":memory:")
db.executescript(sql)
db.execute("INSERT INTO oauth_sessions(state_hash,verifier_ciphertext,created_at,expires_at) VALUES(?,?,?,?)", ("fake-state-hash","fictional-ciphertext",100,700))
assert db.execute("SELECT COUNT(*) FROM oauth_sessions WHERE consumed_at IS NULL").fetchone()[0] == 1
db.execute("UPDATE oauth_sessions SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL AND expires_at>?", (200,"fake-state-hash",200))
assert db.total_changes == 2
assert db.execute("UPDATE oauth_sessions SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL AND expires_at>?", (201,"fake-state-hash",201)).rowcount == 0
db.execute("INSERT INTO oauth_tokens(mailbox,encrypted_refresh_token,scope,updated_at) VALUES(?,?,?,?)", ("info@zyenhomes.com","fictional-encrypted-token","https://www.googleapis.com/auth/gmail.insert",100))
try:
    db.execute("INSERT INTO oauth_tokens(mailbox,encrypted_refresh_token,scope,updated_at) VALUES(?,?,?,?)", ("admin@zyenhomes.com","fake","https://www.googleapis.com/auth/gmail.insert",100))
    raise AssertionError("Mailbox restriction failed")
except sqlite3.IntegrityError:
    pass
print("PASS: in-memory SQLite schema, one-time session update and mailbox restriction")
