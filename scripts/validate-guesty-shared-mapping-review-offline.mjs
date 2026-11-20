import assert from "node:assert/strict";
import {reviewMappedStoredRequest as review} from "../cloudflare/guesty-shared-mapping-review.js";
const record={request_id:"11111111-2222-4333-8444-555555555555",
 property_id:"116-tyrolean",guest_name:"Test Guest",guest_email:"test@example.com",
 guest_phone:"+14165550123",guesty_sync_status:"pending",guesty_sync_claim_token:null,
 guesty_sync_attempt_count:0,request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"f".repeat(64),guesty_quote_id:"a".repeat(24),
 check_in:"2027-01-18",check_out:"2027-01-20",guests:6};
const listing="6914041adf75040043bc8ed8";
const quote={_id:record.guesty_quote_id,unitTypeId:listing,
 checkInDateLocalized:record.check_in,checkOutDateLocalized:record.check_out,guestsCount:6,
 createdAt:"2026-11-20T14:00:00Z",expiresAt:"2026-11-21T14:00:00Z",
 rates:{ratePlans:[{ratePlan:{_id:"b".repeat(24)}}]}};
let gets=0;
const args={record,verifiedAccountListingId:listing,
 verifiedGuest:{firstName:"Test",lastName:"Guest",email:"test@example.com",nameVerified:true},
 claimToken:"claim_token_123456",attemptId:"attempt_id_123456",token:"mock_booking_token",
 now:Date.parse("2026-11-20T15:00:00Z"),
 transport:async(url,options)=>{gets++;assert.equal(options.method,"GET");
 return {ok:true,json:async()=>quote}}};
const good=await review(args);
assert.equal(good.propertyMappingVerified,true);assert.equal(good.guestIdentityVerified,true);
assert.equal(good.canSend,false);assert.equal(good.canClaim,false);assert.equal(good.writeAuthorized,false);
assert.equal(gets,1);
for(const change of [{verifiedAccountListingId:undefined},
 {verifiedAccountListingId:"c".repeat(24)},
 {record:{...record,property_id:"unknown"}}]){
 const before=gets;const r=await review({...args,...change});
 assert.equal(r.canSend,false);assert.equal(gets,before);}
console.log("PASS: shared property mapping requires independently verified listing ID and never authorizes writes.");
