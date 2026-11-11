import assert from "node:assert/strict";
import {executeControlledInquiryWorkflow as run} from "../cloudflare/guesty-booking-engine-workflow.js";
const quoteId="a".repeat(24),listing="b".repeat(24),rate="c".repeat(24),reservation="d".repeat(24);
const record={request_id:"11111111-2222-4333-8444-555555555555",
 guesty_sync_status:"pending",guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"f".repeat(64),guesty_quote_id:quoteId,listing_id:listing,
 check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const quote={_id:quoteId,unitTypeId:listing,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,guestsCount:6,
 createdAt:"2026-11-10T14:00:00Z",expiresAt:"2026-11-11T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:rate}}]}};
const key="x".repeat(40),claimToken="claim_token_123456",attemptId="attempt_id_123456";
let gets=0,claims=0,posts=0;
const args={request:new Request("https://example.com/api/internal/guesty/inquiry",{
 method:"POST",headers:{"Content-Type":"application/json","X-Zyen-Inquiry-Admin-Key":key}}),
 env:{ZYEN_INQUIRY_ADMIN_KEY:key},record,
 guest:{firstName:"Test",lastName:"Guest",email:"test@example.com"},
 claimToken,attemptId,token:"booking_engine_token",
 quoteTransport:async(url,opts)=>{gets++;assert.equal(opts.method,"GET");return {ok:true,json:async()=>quote}},
 now:Date.parse("2026-11-10T15:00:00Z"),
 db:{prepare(sql){return {bind(...binds){return {sql,binds}}}},
 async batch(statements){claims++;return [
 {success:true,results:[{request_id:record.request_id,guesty_sync_claim_token:claimToken}]},
 {success:true,meta:{changes:1}}]}},
 claimAuthorization:{approvedForDatabaseClaim:true,approvedRequestId:record.request_id,approvedAttemptId:attemptId},
 writeAuthorization:{explicitLiveWriteApproval:true,approvedRequestId:record.request_id,
 approvedAttemptId:attemptId,approvedQuoteId:quoteId},
 inquiryTransport:async(url,opts)=>{posts++;assert.equal(opts.method,"POST");
 assert.equal(JSON.parse(opts.body).ratePlanId,rate);
 return {status:200,json:async()=>({_id:reservation,status:"reserved"})}}
};
for(const writeAuthorization of [undefined,{...args.writeAuthorization,approvedQuoteId:"f".repeat(24)}]){
 const result=await run({...args,writeAuthorization});
 assert.equal(result.state,"blocked");assert.equal(result.canMarkSucceeded,false);
}
assert.equal(gets,0);assert.equal(claims,0);assert.equal(posts,0);
const success=await run(args);
assert.equal(success.state,"needs_reconciliation");assert.equal(success.reservationId,reservation);
assert.equal(success.canMarkSucceeded,false);assert.equal(success.retryAutomatically,false);
assert.equal(gets,1);assert.equal(claims,1);assert.equal(posts,1);
const noClaim=await run({...args,db:{...args.db,batch:async()=>{claims++;return [
 {success:true,results:[]},{success:true,meta:{changes:0}}]}}});
assert.equal(noClaim.state,"blocked");assert.equal(posts,1);
const timeout=await run({...args,inquiryTransport:async()=>{posts++;throw Error("timeout")}});
assert.equal(timeout.state,"uncertain");assert.equal(timeout.retryAutomatically,false);
console.log("PASS: gated end-to-end mock claim->POST requires separate approval; timeout never retries or marks success.");
