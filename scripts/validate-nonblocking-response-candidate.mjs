import assert from "node:assert/strict";
import {reviewNonblockingResponse as review} from "../cloudflare/guesty-nonblocking-response-candidate.js";
const id="1234567890abcdef12345678";
const fixture=()=>({status:200,body:{_id:id},record:{guesty_quote_id:"quote",property_id:"listing"},expectedAccountId:"account",reservation:{_id:id,status:"inquiry",quoteId:"quote",listingId:"listing",accountId:"account"}});
assert.equal(review(fixture()).state,"matched_pending_manual_verification");
for(const mutate of [f=>f.reservation.status="reserved",f=>f.reservation.status="confirmed",f=>f.reservation.accountId="wrong",f=>f.reservation.quoteId="wrong",f=>f.reservation.listingId="wrong",f=>delete f.reservation]){
 const f=fixture();mutate(f);assert.equal(review(f).state,"manual_review");
}
for(const f of [{status:500},{transportError:true},{status:200,body:{}},{status:429},fixture()]){
 const r=review(f);assert.equal(r.retryAutomatically,false);assert.equal(r.canMarkSucceeded,false);assert.equal(r.writeAuthorized,false);
}
console.log("PASS: offline response reconciliation gates");
