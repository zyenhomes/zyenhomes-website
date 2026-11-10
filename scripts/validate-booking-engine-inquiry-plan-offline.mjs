import assert from "node:assert/strict";
import {planBookingEngineInquiry as plan} from "../cloudflare/guesty-booking-engine-inquiry-plan.js";
const id="a".repeat(24),listing="b".repeat(24),rate="c".repeat(24),now=Date.parse("2026-11-10T15:00:00Z");
const record={guesty_sync_status:"pending",guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",request_payload_fingerprint:"f".repeat(64),
 guesty_quote_id:id,listing_id:listing,check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const quote={_id:id,unitTypeId:listing,checkInDateLocalized:record.check_in,checkOutDateLocalized:record.check_out,
 guestsCount:6,createdAt:"2026-11-10T14:00:00Z",expiresAt:"2026-11-11T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:rate}}]}};
const guest={firstName:"Test",lastName:"Guest",email:"test@example.com"};
const args={record,quoteResponse:quote,guest,now};
const good=plan(args);
assert.equal(good.ratePlanVerified,true);
assert.equal(good.prepared.body.ratePlanId,rate);
assert.equal(good.prepared.endpoint,"https://booking.guesty.com/api/reservations/quotes/"+id+"/inquiry");
assert.equal(good.ready,false);assert.equal(good.writeAuthorized,false);assert.equal(good.retryAutomatically,false);
for(const modified of [
 {...record,guesty_sync_status:"processing"},
 {...record,guesty_sync_claim_token:"claimed"},
 {...record,guesty_sync_attempt_count:1},
 {...record,request_payload_fingerprint:"invalid"}
]) assert.equal(plan({...args,record:modified}).prepared,null);
for(const changed of [
 {_id:"d".repeat(24)}, {unitTypeId:"d".repeat(24)}, {guestsCount:7},
 {expiresAt:"2026-11-10T14:30:00Z"}, {status:"expired"},
 {rates:{ratePlans:[{ratePlan:{_id:"bad"}}]}}
]) assert.equal(plan({...args,quoteResponse:{...quote,...changed}}).prepared,null);
assert.equal(plan({...args,guest:{...guest,email:"bad"}}).prepared,null);
console.log("PASS: Booking Engine inquiry planning combines quote/rate-plan checks and dedupe, never permits writes.");
