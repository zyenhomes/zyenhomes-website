import assert from "node:assert/strict";
import {reviewBookingEngineSubmission as review} from "../cloudflare/guesty-booking-engine-submission-reconciliation.js";
const id=c=>c.repeat(24);
const record={listing_id:id("a"),guests:6,check_in:"2027-01-18",check_out:"2027-01-20"};
const submission={state:"needs_reconciliation",reservationId:id("b")};
const accountId=id("c"),ratePlanId=id("d");
const reservation={_id:submission.reservationId,accountId,unitTypeId:record.listing_id,
 ratePlanId,guestsCount:6,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,status:"reserved",conversationId:id("e")};
let reads=0;
const args={record,submission,accountId,ratePlanId,token:"mock_booking_token",
 transport:async(url,opts)=>{reads++;assert.equal(opts.method,"GET");
 return {ok:true,json:async()=>reservation}}};
const matched=await review(args);
assert.equal(matched.state,"identity_verified_status_pending");
assert.equal(matched.observedStatus,"reserved");
assert.equal(matched.accountAndStayVerified,true);
assert.equal(matched.canMarkSucceeded,false);assert.equal(matched.canConfirmInquiry,false);
assert.equal(matched.canRetrySubmission,false);assert.equal(reads,1);
for(const change of [{submission:{state:"uncertain"}},
 {submission:{state:"needs_reconciliation",reservationId:"bad"}},
 {accountId:"bad"},{record:{...record,listing_id:"bad"}}]){
 const before=reads;const result=await review({...args,...change});
 assert.equal(result.state,"manual_review");assert.equal(reads,before);
}
for(const wrong of [{...reservation,accountId:id("f")},
 {...reservation,unitTypeId:id("f")},{...reservation,status:null}]){
 const result=await review({...args,transport:async()=>({ok:true,json:async()=>wrong})});
 assert.equal(result.state,"manual_review");assert.equal(result.canMarkSucceeded,false);
}
console.log("PASS: documented Booking Engine account and stay fields reconciled without confirming inquiry.");
