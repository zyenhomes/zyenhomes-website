import assert from "node:assert/strict";
import worker from "../cloudflare/isolated-d1-claim-test-standalone.js";
let batches=0;
const token="x".repeat(32);
const env={TEST_MODE_ENABLED:"true",TEST_DB_NAME:"zyenhomes-booking-test",TEST_ADMIN_TOKEN:token,
 TEST_DB:{prepare(sql){return {bind(...binds){return {sql,binds}}}},
 async batch(statements){batches++;assert.equal(statements.length,2);
 assert.equal(statements[0].binds[1],"test-request-002");
 assert.equal(statements[1].binds[1],"test-request-002");
 return [{success:true,results:[{request_id:"test-request-002",
 guesty_sync_claim_token:"test-claim-valid1"}]},{success:true,meta:{changes:1}}]}}};
const url="https://test.invalid/internal/test-claim";
const valid={requestId:"test-request-002",claimToken:"test-claim-valid1",attemptId:"test-attempt-valid1"};
const req=(body=valid,authorization=`Bearer ${token}`,method="POST")=>
 new Request(url,{method,headers:{Authorization:authorization},body:method==="POST"?JSON.stringify(body):undefined});
for(const [request,settings] of [
 [req(valid,"Bearer wrong"),env],
 [req(valid),{...env,TEST_MODE_ENABLED:"false"}],
 [req(valid),{...env,TEST_DB_NAME:"zyenhomes-booking-requests"}],
 [req({...valid,requestId:"test-request-001"}),env],
 [req(valid,undefined,"GET"),env]
]){const r=await worker.fetch(request,settings);assert.ok(r.status>=400);}
assert.equal(batches,0);
const ok=await worker.fetch(req(),env);
assert.deepEqual(await ok.json(),{state:"claimed_and_audited",claimed:true,guestyWriteAuthorized:false});
assert.equal(batches,1);
const duplicate=await worker.fetch(req(),{...env,TEST_DB:{...env.TEST_DB,
 batch:async()=>[{success:true,results:[]},{success:true,meta:{changes:0}}]}});
assert.equal((await duplicate.json()).claimed,false);
const failed=await worker.fetch(req(),{...env,TEST_DB:{...env.TEST_DB,
 batch:async()=>{throw Error("transaction rollback")}}});
assert.equal((await failed.json()).state,"uncertain");
console.log("PASS: single-file test Worker guards, batch wiring and fail-closed behavior");
