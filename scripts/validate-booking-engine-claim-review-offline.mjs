import assert from "node:assert/strict";
import {reviewBookingEngineInquiryClaim as review,reviewBookingEngineInquiryOutcome as outcome} from "../cloudflare/guesty-booking-engine-claim-review.js";
const id="a".repeat(24),listing="b".repeat(24),rate="c".repeat(24),now=Date.parse("2026-11-10T15:00:00Z");
const record={request_id:"11111111-2222-4333-8444-555555555555",guesty_sync_status:"pending",
 guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"f".repeat(64),guesty_quote_id:id,listing_id:listing,
 check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const quoteResponse={_id:id,unitTypeId:listing,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,guestsCount:6,
 createdAt:"2026-11-10T14:00:00Z",expiresAt:"2026-11-11T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:rate}}]}};
const guest={firstName:"Test",lastName:"Guest",email:"test@example.com"};
const args={record,quoteResponse,guest,claimToken:"claim_token_123456",attemptId:"attempt_id_123456",now};
const r=review(args);
assert.equal(r.ratePlanVerified,true);assert.equal(r.ready,false);assert.equal(r.writeAuthorized,false);
assert.equal(r.claimPlan.statements.length,2);assert.equal(r.claimPlan.requiresAtomicBatch,true);
assert.equal(r.prepared.body.ratePlanId,rate);
for(const bad of [{...record,guesty_sync_status:"processing"},{...record,guesty_sync_attempt_count:1}])
 assert.equal(review({...args,record:bad}).claimPlan,null);
assert.equal(review({...args,claimToken:"bad"}).claimPlan,null);
assert.equal(outcome({claimed:false,responseStatus:200,responseBody:{_id:id}}).state,"blocked");
const accepted=outcome({claimed:true,responseStatus:200,responseBody:{_id:id,status:"reserved"}});
assert.equal(accepted.state,"needs_reconciliation");assert.equal(accepted.canMarkSucceeded,false);
assert.equal(accepted.retryAutomatically,false);
assert.equal(outcome({claimed:true,transportError:true}).state,"uncertain");
console.log("PASS: offline claim review cannot execute Guesty writes or mark inquiry synchronized.");
