// TEST ONLY: pasteable single-file Worker for zyenhomes-d1-claim-test3.
// NOT imported by production. Do not deploy without separate explicit approval.
// Binding must be TEST_DB -> zyenhomes-booking-test (ID checked in Cloudflare UI).
// This code does not contact Guesty, process payments or confirm reservations.
const REQUEST_ID = "test-request-002";
const DB_NAME = "zyenhomes-booking-test";
const CLAIM_SQL = `
UPDATE booking_requests
SET guesty_sync_status = 'processing',
    guesty_sync_claim_token = ?,
    guesty_sync_claimed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    guesty_sync_attempt_count = guesty_sync_attempt_count + 1
WHERE request_id = ?
  AND guesty_sync_status = 'pending'
  AND guesty_sync_claim_token IS NULL
  AND guesty_quote_id IS NOT NULL
RETURNING request_id, guesty_sync_claim_token`.trim();
const AUDIT_SQL = `
INSERT INTO guesty_inquiry_sync_attempts
  (attempt_id, request_id, claim_token, outcome)
SELECT ?, request_id, guesty_sync_claim_token, 'processing'
FROM booking_requests
WHERE request_id = ?
  AND guesty_sync_status = 'processing'
  AND guesty_sync_claim_token = ?
  AND guesty_sync_attempt_count > 0`.trim();
const reply = (data, status=200) => new Response(JSON.stringify(data), {
 status, headers: {"content-type":"application/json","cache-control":"no-store"}
});
export default {
 async fetch(request, env) {
  if(request.method !== "POST" || new URL(request.url).pathname !== "/internal/test-claim")
   return reply({error:"not_found"},404);
  if(env?.TEST_MODE_ENABLED !== "true" ||
     env?.TEST_DB_NAME !== DB_NAME ||
     !env?.TEST_DB?.prepare || !env?.TEST_DB?.batch ||
     typeof env?.TEST_ADMIN_TOKEN !== "string" ||
     env.TEST_ADMIN_TOKEN.length < 24 ||
     request.headers.get("Authorization") !== `Bearer ${env.TEST_ADMIN_TOKEN}`)
   return reply({error:"not_authorized"},403);
  let data;
  try { data=await request.json(); } catch { return reply({error:"invalid_json"},400); }
  if(data?.requestId !== REQUEST_ID ||
     !/^test-claim-[a-z0-9-]{4,40}$/.test(data?.claimToken??"") ||
     !/^test-attempt-[a-z0-9-]{4,40}$/.test(data?.attemptId??"") ||
     data.claimToken === data.attemptId)
   return reply({error:"invalid_test_request"},400);
  try {
   // D1 batch is transactional: claim and audit must commit together.
   const results=await env.TEST_DB.batch([
    env.TEST_DB.prepare(CLAIM_SQL).bind(data.claimToken,REQUEST_ID),
    env.TEST_DB.prepare(AUDIT_SQL).bind(data.attemptId,REQUEST_ID,data.claimToken)
   ]);
   if(!Array.isArray(results)||results.length!==2||results.some(r=>r?.success!==true))
    return reply({state:"uncertain",error:"invalid_batch_result",guestyWriteAuthorized:false},409);
   const [claim,audit]=results;
   if(claim.results?.length===0 && audit.meta?.changes===0)
    return reply({state:"already_claimed",claimed:false,guestyWriteAuthorized:false},200);
   if(claim.results?.length!==1 ||
      claim.results[0].request_id!==REQUEST_ID ||
      claim.results[0].guesty_sync_claim_token!==data.claimToken ||
      audit.meta?.changes!==1)
    return reply({state:"uncertain",error:"claim_audit_mismatch",guestyWriteAuthorized:false},409);
   return reply({state:"claimed_and_audited",claimed:true,guestyWriteAuthorized:false});
  } catch {
   // Never retry automatically; inspect the database after any uncertain outcome.
   return reply({state:"uncertain",error:"database_batch_failed",guestyWriteAuthorized:false},409);
  }
 }
};
