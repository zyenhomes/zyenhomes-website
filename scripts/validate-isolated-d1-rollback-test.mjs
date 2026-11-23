import assert from "node:assert/strict";
import worker from "../cloudflare/isolated-d1-rollback-test-standalone.js";
const token="z".repeat(32);
let reads=0,batches=0;
const db={
 prepare(sql){return {bind(...args){return {sql,args,async first(){
  reads++;return sql.includes("guesty_inquiry_sync_attempts")
   ?{request_id:"test-request-002",claim_token:"test-claim-batch002"}
   :{guesty_sync_status:"pending",guesty_sync_claim_token:null,
     guesty_sync_attempt_count:0,guesty_quote_id:"test-quote-003"};
 }}}}},
 async batch(stmts){batches++;assert.equal(stmts.length,2);
  assert.equal(stmts[0].args[1],"test-request-003");
  assert.equal(stmts[1].args[0],"test-attempt-batch002");
  throw new Error("UNIQUE constraint failed")}
};
const env={TEST_MODE_ENABLED:"true",TEST_DB_NAME:"zyenhomes-booking-test",
 TEST_ADMIN_TOKEN:token,TEST_DB:db};
const url="https://test.invalid/internal/test-rollback";
const req=(body={requestId:"test-request-003",confirmRollbackTest:true},auth=`Bearer ${token}`,method="POST")=>
 new Request(url,{method,headers:{Authorization:auth},
 body:method==="POST"?JSON.stringify(body):undefined});
for(const [request,config] of [
 [req(undefined,"Bearer wrong"),env],
 [req(),{...env,TEST_MODE_ENABLED:"false"}],
 [req(),{...env,TEST_DB_NAME:"zyenhomes-booking-requests"}],
 [req({requestId:"test-request-002",confirmRollbackTest:true}),env],
 [req(undefined,undefined,"GET"),env]
]){const r=await worker.fetch(request,config);assert.ok(r.status>=400)}
assert.equal(reads,0);assert.equal(batches,0);
const r=await worker.fetch(req(),env);
assert.equal(r.status,409);
assert.deepEqual(await r.json(),{state:"batch_failed_verify_database",
 rollbackVerified:false,guestyWriteAuthorized:false,retryAutomatically:false});
assert.equal(reads,2);assert.equal(batches,1);
const noDuplicate=await worker.fetch(req(),{...env,TEST_DB:{...db,
 prepare(sql){return {bind(){return {async first(){return null}}}}}}});
assert.equal((await noDuplicate.json()).reason,"known_duplicate_attempt_missing");
console.log("PASS: isolated rollback test gates, forced duplicate ID, fail-closed outcome");
