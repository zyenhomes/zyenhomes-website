import assert from "node:assert/strict";
import worker from "../cloudflare/isolated-d1-claim-test-worker.js";
let calls=0;
const env={TEST_MODE_ENABLED:"true",TEST_DB_NAME:"zyenhomes-booking-test",
 TEST_ADMIN_TOKEN:"test_secret",TEST_DB:{
 prepare(sql){return {bind(...params){return {sql,params}}}},
 async batch(stmts){calls++;assert.equal(stmts.length,2);
  return [{success:true,results:[{request_id:"test-request-001",
   guesty_sync_claim_token:"test-claim-valid1"}]},
   {success:true,meta:{changes:1}}]}
 }};
const url="https://test.invalid/internal/test-claim";
const request=(body,auth="Bearer test_secret",method="POST")=>new Request(url,{
 method,headers:{Authorization:auth,"Content-Type":"application/json"},
 body:method==="POST"?JSON.stringify(body):undefined
});
const valid={requestId:"test-request-001",claimToken:"test-claim-valid1",
 attemptId:"test-attempt-valid1"};
for(const [req,config] of [
 [request(valid,"Bearer wrong"),env],
 [request(valid),{...env,TEST_MODE_ENABLED:"false"}],
 [request({...valid,requestId:"real-request"}),env],
 [request(valid,undefined,"GET"),env]
]){const r=await worker.fetch(req,config);assert.ok(r.status>=400)}
assert.equal(calls,0);
const result=await worker.fetch(request(valid),env);
assert.equal(result.status,200);
assert.deepEqual(await result.json(),{claimed:true,
 reason:"claim_and_audit_checked",guestyWriteAuthorized:false});
assert.equal(calls,1);
console.log("PASS: test Worker denies unapproved routes/inputs and calls only isolated D1 batch");
