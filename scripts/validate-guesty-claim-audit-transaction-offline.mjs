// Offline SQLite transaction tests. Never connects to D1 or Guesty.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { CLAIM_SQL, RECORD_ATTEMPT_SQL, MARK_UNCERTAIN_SQL, MARK_SUCCESS_SQL } from "./guesty-sync-claim-sql-offline.mjs";

const db = new DatabaseSync(":memory:");
const row = id => db.prepare("SELECT * FROM booking_requests WHERE request_id=?").get(id);
const audit = id => db.prepare("SELECT * FROM guesty_inquiry_sync_attempts WHERE request_id=?").all(id);
function insert(id) {
  db.prepare(`INSERT INTO booking_requests
    (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,"149-tyrolean","Offline Test","test@example.invalid",
      "+14165550101","2027-01-14","2027-01-18",6,105300,"6adb5d7320cb330ec34a3507");
}
// This local reference implementation demonstrates an all-or-nothing claim+audit transaction.
// It is NOT wired into the Worker; D1 transaction semantics must be verified separately.
function claimWithAudit(id, token, attemptId, { failAfterClaim = false } = {}) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const claimed = db.prepare(CLAIM_SQL).get(token,id);
    if (!claimed) { db.exec("ROLLBACK"); return false; }
    if (failAfterClaim) throw Error("simulated audit failure");
    db.prepare(RECORD_ATTEMPT_SQL).run(attemptId,id,token);
    db.exec("COMMIT");
    return true;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
try {
  db.exec("PRAGMA foreign_keys=ON");
  for (const path of [
    "cloudflare/migrations/0001_booking_requests.sql",
    "cloudflare/migrations/0003_booking_request_guesty_quote_id.sql",
    "cloudflare/migrations/0004_guesty_inquiry_sync_claims.sql"
  ]) db.exec(readFileSync(path,"utf8"));

  insert("request-rollback");
  assert.throws(() => claimWithAudit("request-rollback","token-rollback","attempt-rollback",
    { failAfterClaim:true }), /simulated audit failure/);
  assert.equal(row("request-rollback").guesty_sync_status,"pending");
  assert.equal(row("request-rollback").guesty_sync_claim_token,null);
  assert.equal(row("request-rollback").guesty_sync_attempt_count,0);
  assert.equal(audit("request-rollback").length,0);

  insert("request-a");
  assert.equal(claimWithAudit("request-a","token-a","attempt-a"),true);
  assert.equal(claimWithAudit("request-a","token-b","attempt-b"),false);
  assert.equal(row("request-a").guesty_sync_attempt_count,1);
  assert.equal(audit("request-a").length,1);
  assert.equal(audit("request-a")[0].claim_token,"token-a");
  assert.equal(db.prepare(MARK_UNCERTAIN_SQL).run("request-a","token-a").changes,1);
  assert.equal(claimWithAudit("request-a","token-c","attempt-c"),false);
  assert.equal(audit("request-a").length,1);

  insert("request-b");
  assert.equal(claimWithAudit("request-b","token-d","attempt-d"),true);
  assert.equal(db.prepare(MARK_SUCCESS_SQL).run("6adb5d7320cb330ec34a3507","request-b","token-d").changes,1);
  assert.equal(claimWithAudit("request-b","token-e","attempt-e"),false);
  assert.equal(audit("request-b").length,1);

  // An audit token collision must roll back the new claim, not leave it stuck processing.
  insert("request-c");
  assert.throws(() => claimWithAudit("request-c","token-a","attempt-c"), /UNIQUE constraint failed/);
  assert.equal(row("request-c").guesty_sync_status,"pending");
  assert.equal(row("request-c").guesty_sync_attempt_count,0);
  assert.equal(audit("request-c").length,0);

  console.log("PASS: claim and audit are atomic in local SQLite, with rollback and no automatic uncertain retry.");
  console.log("LIMITATION: does not validate Cloudflare D1 batch behavior or Guesty exactly-once delivery.");
} finally { db.close(); }
