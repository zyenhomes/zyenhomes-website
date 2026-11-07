// Generates a deterministic SQL fixture for Wrangler's LOCAL D1 emulator only.
// Does not connect to remote D1, deploy Workers, or call Guesty.
import { writeFileSync } from "node:fs";
import { CLAIM_SQL, RECORD_ATTEMPT_SQL, MARK_UNCERTAIN_SQL } from "./guesty-sync-claim-sql-offline.mjs";

const q = id => "'" + id + "'";
const insert = id => `INSERT INTO booking_requests
(request_id,property_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,quote_total_cents,guesty_quote_id)
VALUES (${q(id)},'149-tyrolean','Local Test','test@example.invalid','+14165550101','2027-01-14','2027-01-18',6,105300,'6adb5d7320cb330ec34a3507');`;
const claim = (token,id) => CLAIM_SQL.replaceAll("?",()=>{throw Error("bind markers must be replaced explicitly")});
// Convert only the known templates, without accepting user input.
const claimSql = (token,id) => CLAIM_SQL.replace("guesty_sync_claim_token = ?",`guesty_sync_claim_token = ${q(token)}`)
  .replace("WHERE request_id = ?",`WHERE request_id = ${q(id)}`);
const auditSql = (attempt,id,token) => RECORD_ATTEMPT_SQL.replace("VALUES (?,?,?,'processing')",
  `VALUES (${q(attempt)},${q(id)},${q(token)},'processing')`);
const uncertainSql = (id,token) => MARK_UNCERTAIN_SQL.replace("WHERE request_id = ?",`WHERE request_id = ${q(id)}`)
  .replace("guesty_sync_claim_token = ?",`guesty_sync_claim_token = ${q(token)}`);
const sql = [
  insert("local-a"), insert("local-b"),
  "BEGIN TRANSACTION;",
  claimSql("claim-a","local-a") + ";",
  auditSql("attempt-a","local-a") + ";",
  "COMMIT;",
  claimSql("claim-b","local-a") + ";",
  uncertainSql("local-a","claim-a") + ";",
  claimSql("claim-c","local-a") + ";",
  claimSql("claim-d","local-b") + ";",
  `SELECT 'ASSERT|' || (SELECT guesty_sync_status FROM booking_requests WHERE request_id='local-a')
    || '|' || (SELECT guesty_sync_attempt_count FROM booking_requests WHERE request_id='local-a')
    || '|' || (SELECT COUNT(*) FROM guesty_inquiry_sync_attempts WHERE request_id='local-a')
    || '|' || (SELECT guesty_sync_claim_token FROM booking_requests WHERE request_id='local-b') AS result;`
].join("\n");
writeFileSync("/tmp/zyenhomes-local-d1-claim-fixture.sql",sql);
console.log("Generated local D1 fixture; no remote commands.");
