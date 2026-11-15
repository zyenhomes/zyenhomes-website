import assert from "node:assert/strict";
import {reviewStoredRequestForInquiry as review} from "../cloudflare/guesty-verified-guest-mapping.js";
const id="a".repeat(24),listing="b".repeat(24),rate="c".repeat(24);
const record={request_id:"11111111-2222-4333-8444-555555555555",
 property_id:"116-tyrolean",guest_name:"Test Guest",guest_email:"test@example.com",
 guest_phone:"+14165550123",guesty_sync_status:"pending",
 guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"f".repeat(64),guesty_quote_id:id,
 check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const quote={_id:id,unitTypeId:listing,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,guestsCount:6,
 createdAt:"2026-11-14T14:00:00Z",expiresAt:"2026-11-15T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:rate}}]}};
let reads=0;
const args={record,verifiedMapping:{propertyId:record.property_id,listingId:listing,accountVerified:true},
 verifiedGuest:{firstName:"Test",lastName:"Guest",email:"test@example.com",nameVerified:true},
 claimToken:"claim_token_123456",attemptId:"attempt_id_123456",
 token:"mock_booking_token",now:Date.parse("2026-11-14T15:00:00Z"),
 transport:async(url,opts)=>{reads++;assert.equal(opts.method,"GET");
 return {ok:true,json:async()=>quote}}};
const ok=await review(args);
assert.equal(ok.propertyMappingVerified,true);assert.equal(ok.guestIdentityVerified,true);
assert.equal(ok.prepared.body.guest.firstName,"Test");
assert.equal(ok.prepared.body.guest.lastName,"Guest");
assert.equal(ok.prepared.body.ratePlanId,rate);
assert.equal(ok.canSend,false);assert.equal(ok.canClaim,false);assert.equal(ok.writeAuthorized,false);
for(const change of [
 {verifiedMapping:{...args.verifiedMapping,accountVerified:false}},
 {verifiedGuest:{...args.verifiedGuest,nameVerified:false}},
 {verifiedGuest:{...args.verifiedGuest,lastName:"Other"}},
 {verifiedGuest:{...args.verifiedGuest,email:"other@example.com"}}
]){const before=reads;const r=await review({...args,...change});
 assert.equal(r.canSend,false);assert.equal(r.ready,false);assert.equal(reads,before);}
console.log("PASS: stored request maps to verified Guesty listing and separate guest names without any writes.");
