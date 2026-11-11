import assert from "node:assert/strict";
import {executeInquiryClaimWithAudit as execute} from "../cloudflare/guesty-d1-claim-executor.js";
const ids={requestId:"request_id_123456",claimToken:"claim_token_123456",attemptId:"attempt_id_123456"};
const authorization={approvedForDatabaseClaim:true,approvedRequestId:ids.requestId,approvedAttemptId:ids.attemptId};
let batches=0,statements=[];
const db={prepare(sql){return {bind(...values){return {sql,values}}}},
 async batch(prepared){batches++;statements=prepared;return [
  {success:true,results:[{request_id:ids.requestId,guesty_sync_claim_token:ids.claimToken}]},
  {success:true,meta:{changes:1}}
 ];}};
for(const auth of [undefined,{}, {...authorization,approvedRequestId:"wrong"},
 {...authorization,approvedAttemptId:"wrong"}]){
 const r=await execute({db,ids,authorization:auth});
 assert.equal(r.claimed,false);assert.equal(r.canSendInquiry,false);
}
assert.equal(batches,0);
const result=await execute({db,ids,authorization});
assert.equal(result.claimed,true);assert.equal(result.canSendInquiry,false);
assert.equal(result.guestyWriteAuthorized,false);assert.equal(result.retryAutomatically,false);
assert.equal(batches,1);assert.equal(statements.length,2);
assert.match(statements[0].sql,/UPDATE booking_requests/);
assert.match(statements[1].sql,/INSERT INTO guesty_inquiry_sync_attempts/);
const contested=await execute({db:{...db,batch:async()=>[
 {success:true,results:[]},{success:true,meta:{changes:0}}]},ids,authorization});
assert.equal(contested.claimed,false);
const ambiguous=await execute({db:{...db,batch:async()=>{throw Error("timeout")}},ids,authorization});
assert.equal(ambiguous.reason,"database_claim_uncertain_manual_review");
assert.equal(ambiguous.retryAutomatically,false);
const mismatch=await execute({db:{...db,batch:async()=>[
 {success:true,results:[{request_id:ids.requestId,guesty_sync_claim_token:ids.claimToken}]},
 {success:true,meta:{changes:0}}]},ids,authorization});
assert.equal(mismatch.claimed,false);
console.log("PASS: explicitly authorized atomic D1 claim requires matching audit and never sends Guesty inquiry.");
