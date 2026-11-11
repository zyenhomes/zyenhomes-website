import assert from "node:assert/strict";
import {reviewAndClaimInquiry as run} from "../cloudflare/guesty-claim-orchestration.js";
const id="a".repeat(24),listing="b".repeat(24),rate="c".repeat(24);
const record={request_id:"11111111-2222-4333-8444-555555555555",
 guesty_sync_status:"pending",guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"f".repeat(64),guesty_quote_id:id,listing_id:listing,
 check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const quote={_id:id,unitTypeId:listing,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,guestsCount:6,
 createdAt:"2026-11-10T14:00:00Z",expiresAt:"2026-11-11T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:rate}}]}};
const key="x".repeat(40),claimToken="claim_token_123456",attemptId="attempt_id_123456";
let reads=0,batches=0;
const args={request:new Request("https://example.com/api/internal/guesty/inquiry",{
 method:"POST",headers:{"Content-Type":"application/json","X-Zyen-Inquiry-Admin-Key":key}}),
 env:{ZYEN_INQUIRY_ADMIN_KEY:key},record,
 guest:{firstName:"Test",lastName:"Guest",email:"test@example.com"},
 claimToken,attemptId,token:"booking_engine_token",
 quoteTransport:async(url,opts)=>{reads++;assert.equal(opts.method,"GET");
 return {ok:true,json:async()=>quote}},
 now:Date.parse("2026-11-10T15:00:00Z"),
 db:{prepare(sql){return {bind(...binds){return {sql,binds}}}},
 async batch(statements){batches++;assert.equal(statements.length,2);return [
 {success:true,results:[{request_id:record.request_id,guesty_sync_claim_token:claimToken}]},
 {success:true,meta:{changes:1}}]}}
};
const unauthorized=await run(args);
assert.equal(unauthorized.reason,"database_claim_not_authorized");
assert.equal(batches,0);assert.equal(unauthorized.canSend,false);
const authorization={approvedForDatabaseClaim:true,
 approvedRequestId:record.request_id,approvedAttemptId:attemptId};
const success=await run({...args,authorization});
assert.equal(success.state,"claimed");assert.equal(success.claimCommitted,true);
assert.equal(success.prepared.body.ratePlanId,rate);
assert.equal(success.canSend,false);assert.equal(success.canMarkSucceeded,false);
assert.equal(batches,1);
const denied=await run({...args,request:new Request("https://example.com/api/internal/guesty/inquiry",{
 method:"POST",headers:{"Content-Type":"application/json"}}),authorization});
assert.equal(denied.state,"blocked");assert.equal(batches,1);
const conflict=await run({...args,authorization,db:{...args.db,batch:async()=>[
 {success:true,results:[]},{success:true,meta:{changes:0}}]}});
assert.equal(conflict.state,"blocked");assert.equal(conflict.canSend,false);
console.log("PASS: isolated claim orchestration enforces auth, quote verification, atomic claim, and never sends.");
