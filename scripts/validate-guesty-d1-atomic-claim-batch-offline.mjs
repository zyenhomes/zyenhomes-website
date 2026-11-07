import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { buildAtomicClaimBatchPlan } from "./guesty-d1-atomic-claim-batch-offline.mjs";

const db = new DatabaseSync(":memory:");
try {
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of [
    "cloudflare/migrations/0001_booking_requests.sql",
    "cloudflare/migrations/0003_booking_request_guesty_quote_id.sql",
    "cloudflare/migrations/0004_guesty_inquiry_sync_claims.sql"
  ]) db.exec(readFileSync(file,"utf8"));

  const add = (id,quote="6adb5d7320cb330ec34a3507") => db.prepare(`
    INSERT INTO booking_requests
    (request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id,"149-tyrolean","Local Test","test@example.invalid",
      "+14165550101","2027-01-14","2027-01-18",6,105300,quote);
  const row = id => db.prepare("SELECT * FROM booking_requests WHERE request_id=?").get(id);
  const audits = id => db.prepare("SELECT * FROM guesty_inquiry_sync_attempts WHERE request_id=?").all(id);
  const runPlan = (id,token,attempt) => {
    const plan = buildAtomicClaimBatchPlan({requestId:id,claimToken:token,attemptId:attempt});
    assert.equal(plan.executable,false);
    assert.equal(plan.requiresAtomicBatch,true);
    db.exec("BEGIN IMMEDIATE");
    try {
      const claim = db.prepare(plan.statements[0].sql).get(...plan.statements[0].binds);
      const inserted = db.prepare(plan.statements[1].sql).run(...plan.statements[1].binds);
      db.exec("COMMIT");
      return { claim, inserted:inserted.changes };
    } catch (e) { db.exec("ROLLBACK"); throw e; }
  };

  add("request-a");
  assert.equal(runPlan("request-a","token-a-123","attempt-a-123").inserted,1);
  assert.equal(runPlan("request-a","token-b-123","attempt-b-123").inserted,0);
  assert.equal(row("request-a").guesty_sync_attempt_count,1);
  assert.equal(audits("request-a").length,1);
  assert.equal(audits("request-a")[0].claim_token,"token-a-123");

  add("request-b",null);
  assert.equal(runPlan("request-b","token-c-123","attempt-c-123").inserted,0);
  assert.equal(row("request-b").guesty_sync_status,"pending");
  assert.equal(audits("request-b").length,0);

  // A failed audit INSERT rolls back the preceding UPDATE.
  add("request-c");
  assert.throws(() => runPlan("request-c","token-a-123","attempt-d-123"),/UNIQUE constraint failed/);
  assert.equal(row("request-c").guesty_sync_status,"pending");
  assert.equal(row("request-c").guesty_sync_attempt_count,0);
  assert.equal(audits("request-c").length,0);

  assert.throws(() => buildAtomicClaimBatchPlan({requestId:"bad",claimToken:"token-a-123",attemptId:"attempt-a-123"}));
  console.log("PASS: local SQLite claim/audit batch plan handles competing claims, missing quotes and rollback.");
  console.log("LIMITATION: real Cloudflare D1 batch semantics and Guesty delivery remain unverified.");
} finally { db.close(); }
