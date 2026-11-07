// Local, in-memory SQLite integration tests only. No Cloudflare/Guesty network calls.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { CLAIM_SQL, RECORD_ATTEMPT_SQL, MARK_UNCERTAIN_SQL, MARK_SUCCESS_SQL } from "./guesty-sync-claim-sql-offline.mjs";

const db = new DatabaseSync(":memory:");
try {
  db.exec("PRAGMA foreign_keys=ON");
  for (const migration of [
    "cloudflare/migrations/0001_booking_requests.sql",
    "cloudflare/migrations/0003_booking_request_guesty_quote_id.sql",
    "cloudflare/migrations/0004_guesty_inquiry_sync_claims.sql"
  ]) db.exec(readFileSync(migration, "utf8"));

  const insert = db.prepare(`INSERT INTO booking_requests
    (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,
     guests,quote_total_cents,guesty_quote_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const add = (id, quote) => insert.run(id, "149-tyrolean", "Test Guest", "test@example.invalid",
    "+14165550101", "2027-01-14", "2027-01-18", 6, 105300, quote);
  const get = id => db.prepare("SELECT * FROM booking_requests WHERE request_id=?").get(id);
  const claim = (token,id) => db.prepare(CLAIM_SQL).get(token,id);

  add("request-a", "6adb5d7320cb330ec34a3507");
  const first = claim("claim-a", "request-a");
  assert.equal(first?.request_id, "request-a");
  assert.equal(first?.guesty_sync_claim_token, "claim-a");
  assert.equal(claim("claim-b", "request-a"), undefined, "second contender cannot claim");
  assert.equal(get("request-a").guesty_sync_attempt_count, 1);

  db.prepare(RECORD_ATTEMPT_SQL).run("attempt-a", "request-a", "claim-a");
  assert.throws(() => db.prepare(RECORD_ATTEMPT_SQL).run("attempt-b","request-a","claim-a"),
    /UNIQUE constraint failed/);

  assert.equal(db.prepare(MARK_UNCERTAIN_SQL).run("request-a","claim-b").changes, 0);
  assert.equal(db.prepare(MARK_UNCERTAIN_SQL).run("request-a","claim-a").changes, 1);
  assert.equal(get("request-a").guesty_sync_status, "uncertain");
  assert.equal(claim("claim-c","request-a"), undefined, "uncertain cannot be reclaimed");
  assert.equal(db.prepare(MARK_SUCCESS_SQL).run("6adb5d7320cb330ec34a3507","request-a","claim-a").changes,0);

  add("request-b",null);
  assert.equal(claim("claim-d","request-b"), undefined, "missing quote cannot be claimed");
  assert.equal(get("request-b").guesty_sync_status,"pending");

  add("request-c","6adb5d7320cb330ec34a3507");
  assert.equal(claim("claim-e","request-c")?.request_id,"request-c");
  assert.equal(db.prepare(MARK_SUCCESS_SQL).run("6adb5d7320cb330ec34a3507","request-c","wrong").changes,0);
  assert.equal(db.prepare(MARK_SUCCESS_SQL).run("6adb5d7320cb330ec34a3507","request-c","claim-e").changes,1);
  assert.equal(get("request-c").guesty_sync_status,"succeeded");
  assert.equal(claim("claim-f","request-c"),undefined);
  assert.equal(db.prepare(MARK_SUCCESS_SQL).run("6adb5d7320cb330ec34a3507","request-c","claim-e").changes,0);

  // Audit insert must be in the same atomic D1 transaction/batch as the claim in production.
  // These tests establish SQLite guard behavior, NOT external exactly-once Guesty delivery.
  console.log("PASS: SQLite claims are exclusive; uncertain and successful requests cannot be reclaimed.");
} finally {
  db.close();
}
