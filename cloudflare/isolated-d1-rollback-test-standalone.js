// TEST ONLY. Standalone rollback-test Worker for zyenhomes-d1-claim-test3.
// NOT imported by production. Do not deploy without separate explicit approval.
// TEST_DB must be bound to the independently verified zyenhomes-booking-test D1.
// No Guesty calls, payments, reservations, retries, or background processing.
const DB_NAME="zyenhomes-booking-test";
const TARGET="test-request-003";
const EXISTING_ATTEMPT="test-attempt-batch002";
const EXISTING_REQUEST="test-request-002";
const EXISTING_TOKEN="test-claim-batch002";
const NEW_TOKEN="test-claim-rollback003";
const CLAIM_SQL=`
UPDATE booking_requests
SET guesty_sync_status='processing',
 guesty_sync_claim_token=?,
 guesty_sync_claimed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
 guesty_sync_attempt_count=guesty_sync_attempt_count+1
WHERE request_id=? AND guesty_sync_status='pending'
 AND guesty_sync_claim_token IS NULL AND guesty_quote_id IS NOT NULL
RETURNING request_id,guesty_sync_claim_token`.trim();
const AUDIT_SQL=`
INSERT INTO guesty_inquiry_sync_attempts
 (attempt_id,request_id,claim_token,outcome)
SELECT ?,request_id,guesty_sync_claim_token,'processing'
FROM booking_requests
WHERE request_id=? AND guesty_sync_status='processing'
 AND guesty_sync_claim_token=? AND guesty_sync_attempt_count>0`.trim();
const reply=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
export default {
 async fetch(request,env) {
  if(request.method!=="POST"||new URL(request.url).pathname!=="/internal/test-rollback")
   return reply({error:"not_found"},404);
  if(env?.TEST_MODE_ENABLED!=="true"||env?.TEST_DB_NAME!==DB_NAME||
     typeof env?.TEST_ADMIN_TOKEN!=="string"||env.TEST_ADMIN_TOKEN.length<24||
     request.headers.get("Authorization")!==`Bearer ${env.TEST_ADMIN_TOKEN}`||
     !env?.TEST_DB?.prepare||!env?.TEST_DB?.batch)
   return reply({error:"not_authorized"},403);
  let input;
  try{input=await request.json()}catch{return reply({error:"invalid_json"},400)}
  if(input?.requestId!==TARGET||input?.confirmRollbackTest!==true)
   return reply({error:"invalid_test_request"},400);
  try{
   // Fail closed unless the known duplicate attempt exists and target is fresh.
   const existing=await env.TEST_DB.prepare(
    "SELECT request_id,claim_token FROM guesty_inquiry_sync_attempts WHERE attempt_id=?"
   ).bind(EXISTING_ATTEMPT).first();
   if(existing?.request_id!==EXISTING_REQUEST||
      existing?.claim_token!==EXISTING_TOKEN)
    return reply({state:"blocked",reason:"known_duplicate_attempt_missing"},409);
   const target=await env.TEST_DB.prepare(
    "SELECT guesty_sync_status,guesty_sync_claim_token,guesty_sync_attempt_count,guesty_quote_id FROM booking_requests WHERE request_id=?"
   ).bind(TARGET).first();
   if(target?.guesty_sync_status!=="pending"||
      target.guesty_sync_claim_token!==null||
      target.guesty_sync_attempt_count!==0||
      !target.guesty_quote_id)
    return reply({state:"blocked",reason:"test_request_not_fresh"},409);
   // First statement would claim target; second deliberately violates UNIQUE
   // constraint on attempt_id. D1 batch should roll back both statements.
   await env.TEST_DB.batch([
    env.TEST_DB.prepare(CLAIM_SQL).bind(NEW_TOKEN,TARGET),
    env.TEST_DB.prepare(AUDIT_SQL).bind(EXISTING_ATTEMPT,TARGET,NEW_TOKEN)
   ]);
   // Unexpected success is NEVER considered a pass.
   return reply({state:"unexpected_batch_success",rollbackVerified:false,
    guestyWriteAuthorized:false},409);
  }catch{
   // A failed batch alone is not proof of rollback. Inspect D1 with read-only SQL.
   return reply({state:"batch_failed_verify_database",rollbackVerified:false,
    guestyWriteAuthorized:false,retryAutomatically:false},409);
  }
 }
};
