"""Offline SQLite concurrency test of D1 claim SQL. No Cloudflare/Guesty access."""
import concurrent.futures
import pathlib
import sqlite3
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "cloudflare" / "migrations"
CLAIM = """
UPDATE booking_requests
SET guesty_sync_status='processing',
    guesty_sync_claim_token=?,
    guesty_sync_claimed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    guesty_sync_attempt_count=guesty_sync_attempt_count+1
WHERE request_id=? AND guesty_sync_status='pending'
 AND guesty_sync_claim_token IS NULL AND guesty_quote_id IS NOT NULL
RETURNING request_id,guesty_sync_claim_token
"""
AUDIT = """
INSERT INTO guesty_inquiry_sync_attempts
 (attempt_id,request_id,claim_token,outcome)
SELECT ?,request_id,guesty_sync_claim_token,'processing'
FROM booking_requests
WHERE request_id=? AND guesty_sync_status='processing'
 AND guesty_sync_claim_token=? AND guesty_sync_attempt_count>0
"""

def connect(path):
    db = sqlite3.connect(path, timeout=15, isolation_level=None)
    db.execute("PRAGMA busy_timeout=15000")
    return db

with tempfile.TemporaryDirectory(prefix="zyen-claim-test-") as directory:
    path = pathlib.Path(directory) / "test.sqlite"
    with connect(path) as db:
        for name in ("0001_booking_requests.sql", "0002_guesty_message_events.sql",
                     "0003_booking_request_guesty_quote_id.sql",
                     "0004_guesty_inquiry_sync_claims.sql",
                     "0005_booking_request_idempotency.sql"):
            db.executescript((MIGRATIONS / name).read_text())
        db.execute("""INSERT INTO booking_requests
          (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,
           guests,quote_total_cents,guesty_quote_id)
          VALUES ('test-request','test-property','Test Guest','test@example.invalid','000',
                  '2027-01-18','2027-01-20',2,10000,'test-quote')""")

    def contender(index):
        claim_token = f"claim-{index:03d}"
        attempt_id = f"attempt-{index:03d}"
        db = connect(path)
        try:
            db.execute("BEGIN IMMEDIATE")
            claimed = db.execute(CLAIM, (claim_token, "test-request")).fetchall()
            audit = db.execute(AUDIT, (attempt_id, "test-request", claim_token)).rowcount
            db.execute("COMMIT")
            return len(claimed), audit
        except BaseException:
            if db.in_transaction:
                db.execute("ROLLBACK")
            raise
        finally:
            db.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(contender, range(24)))

    assert results.count((1, 1)) == 1, results
    assert results.count((0, 0)) == 23, results
    with connect(path) as db:
        status, attempts, token = db.execute(
            "SELECT guesty_sync_status,guesty_sync_attempt_count,guesty_sync_claim_token "
            "FROM booking_requests WHERE request_id='test-request'").fetchone()
        assert (status, attempts) == ("processing", 1)
        assert token.startswith("claim-")
        assert db.execute("SELECT COUNT(*) FROM guesty_inquiry_sync_attempts").fetchone()[0] == 1
        assert db.execute("SELECT claim_token FROM guesty_inquiry_sync_attempts").fetchone()[0] == token
        try:
            db.execute("""INSERT INTO guesty_inquiry_sync_attempts
               (attempt_id,request_id,claim_token,outcome)
               VALUES ('duplicate-attempt','test-request',?,'processing')""", (token,))
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("Duplicate claim token was accepted")
print("PASS: 24 competing SQLite claims -> 1 claim, 1 audit, 23 blocked; unique token enforced")
