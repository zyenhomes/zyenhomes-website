import assert from "node:assert/strict";
import {assessControlledInquirySubmission as assess} from "../cloudflare/guesty-booking-engine-controlled-submission.js";
const id="a".repeat(24),listing="b".repeat(24),rate="c".repeat(24),now=Date.parse("2026-11-10T15:00:00Z");
const record={request_id:"11111111-2222-4333-8444-555555555555",
 guesty_sync_status:"pending",guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"f".repeat(64),guesty_quote_id:id,listing_id:listing,
 check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const quote={_id:id,unitTypeId:listing,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,guestsCount:6,
 createdAt:"2026-11-10T14:00:00Z",expiresAt:"2026-11-11T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:rate}}]}};
const key="x".repeat(40),url="https://example.com/api/internal/guesty/inquiry";
const request=(k)=>new Request(url,{method:"POST",headers:{"Content-Type":"application/json",
 ...(k?{"X-Zyen-Inquiry-Admin-Key":k}:{})}});
let calls=0;
const quoteTransport=async(url,opts)=>{calls++;assert.equal(opts.method,"GET");
 assert.equal(opts.body,undefined);return {ok:true,json:async()=>quote};};
const args={request:request(key),env:{ZYEN_INQUIRY_ADMIN_KEY:key},
 record,guest:{firstName:"Test",lastName:"Guest",email:"test@example.com"},
 claimToken:"claim_token_123456",attemptId:"attempt_id_123456",
 token:"booking_engine_token",quoteTransport,now};
const good=await assess(args);
assert.equal(good.quoteVerified,true);assert.equal(good.ratePlanVerified,true);
assert.equal(good.prepared.body.ratePlanId,rate);
assert.equal(good.claimPlan.statements.length,2);
assert.equal(good.allowed,false);assert.equal(good.canSend,false);assert.equal(good.canClaim,false);
assert.equal(good.retryAutomatically,false);assert.equal(calls,1);
const before=calls;
for(const changed of [{request:request(null)},{request:request("wrong")},
 {record:{...record,guesty_sync_status:"processing"}},
 {record:{...record,guesty_sync_attempt_count:1}}]){
 const result=await assess({...args,...changed});
 assert.equal(result.canSend,false);assert.equal(result.canClaim,false);
}
assert.equal(calls,before);
const failed=await assess({...args,quoteTransport:async()=>{throw Error("timeout")}});
assert.equal(failed.canSend,false);assert.equal(failed.retryAutomatically,false);
console.log("PASS: authenticated quote preflight remains non-executable and never writes.");
