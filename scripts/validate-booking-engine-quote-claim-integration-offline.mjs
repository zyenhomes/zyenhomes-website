import assert from "node:assert/strict";
import {reviewInquiryFromRetrievedQuote as review} from "../cloudflare/guesty-booking-engine-quote-claim-integration.js";
const id="a".repeat(24),listing="b".repeat(24),rate="c".repeat(24);
const now=Date.parse("2026-11-10T15:00:00Z");
const record={request_id:"11111111-2222-4333-8444-555555555555",
 guesty_sync_status:"pending",guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"f".repeat(64),guesty_quote_id:id,listing_id:listing,
 check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const quote={_id:id,unitTypeId:listing,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,guestsCount:6,
 createdAt:"2026-11-10T14:00:00Z",expiresAt:"2026-11-11T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:rate}}]}};
let calls=0;
const transport=async(url,opts)=>{calls++;assert.equal(opts.method,"GET");
 assert.equal(opts.body,undefined);
 return {ok:true,json:async()=>({results:quote})};};
const args={record,guest:{firstName:"Test",lastName:"Guest",email:"test@example.com"},
 claimToken:"claim_token_123456",attemptId:"attempt_id_123456",
 token:"booking_engine_token",transport,now};
const result=await review(args);
assert.equal(result.quoteVerified,true);assert.equal(result.ratePlanVerified,true);
assert.equal(result.prepared.body.ratePlanId,rate);
assert.equal(result.claimPlan.statements.length,2);
assert.equal(result.ready,false);assert.equal(result.canClaim,false);assert.equal(result.canSend,false);
assert.equal(result.writeAuthorized,false);assert.equal(calls,1);
for(const modified of [
 {...record,guesty_sync_status:"processing"},
 {...record,guesty_sync_attempt_count:1}
]){const before=calls;const r=await review({...args,record:modified});
 assert.equal(r.canSend,false);assert.equal(calls,before);}
for(const badQuote of [
 {...quote,unitTypeId:"d".repeat(24)},
 {...quote,expiresAt:"2026-11-10T14:30:00Z"},
 {...quote,rates:{ratePlans:[]}}
]){const r=await review({...args,transport:async()=>({ok:true,json:async()=>badQuote})});
 assert.equal(r.canClaim,false);assert.equal(r.canSend,false);}
const timeout=await review({...args,transport:async()=>{throw Error("timeout")}});
assert.equal(timeout.canSend,false);assert.equal(timeout.retryAutomatically,false);
console.log("PASS: read-only quote retrieval feeds offline claim review; no Guesty POST or D1 writes.");
