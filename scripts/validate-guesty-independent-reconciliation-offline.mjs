import assert from "node:assert/strict";
import {reviewSubmittedInquiryReadOnly as review} from "../cloudflare/guesty-independent-inquiry-reconciliation.js";
const reservationId="a".repeat(24),quoteId="b".repeat(24),listingId="c".repeat(24);
const record={guesty_quote_id:quoteId,listing_id:listingId};
const submission={state:"needs_reconciliation",reservationId};
let calls=0;
const transport=async(url,options)=>{calls++;
 assert.equal(url,"https://open-api.guesty.com/v1/reservations-v3/"+reservationId);
 assert.equal(options.method,"GET");assert.equal(options.body,undefined);
 return {ok:true,json:async()=>({_id:reservationId,status:"inquiry",quoteId,listingId})};};
const args={record,submission,openApiToken:"mock_open_api_token",transport};
const good=await review(args);
assert.equal(good.state,"matched_pending_manual_verification");
assert.equal(good.quoteAndListingMatched,true);
assert.equal(good.canMarkSucceeded,false);assert.equal(good.canRetrySubmission,false);
assert.equal(calls,1);
for(const change of [
 {submission:{state:"uncertain"}},
 {submission:{state:"needs_reconciliation",reservationId:"bad"}},
 {record:{...record,listing_id:"bad"}}
]){const before=calls;const result=await review({...args,...change});
 assert.equal(result.state,"manual_review");assert.equal(calls,before);}
for(const reservation of [
 {_id:reservationId,status:"reserved",quoteId,listingId},
 {_id:reservationId,status:"inquiry",quoteId:"d".repeat(24),listingId},
 {_id:reservationId,status:"inquiry",quoteId,listingId:"d".repeat(24)}
]){const result=await review({...args,transport:async()=>({ok:true,json:async()=>reservation})});
 assert.equal(result.state,"manual_review");assert.equal(result.canMarkSucceeded,false);}
const timeout=await review({...args,transport:async()=>{throw Error("timeout")}});
assert.equal(timeout.state,"manual_review");assert.equal(timeout.canRetrySubmission,false);
console.log("PASS: independent GET reconciliation never marks success or retries inquiry POST.");
