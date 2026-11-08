import assert from "node:assert/strict";
import {verifyGuestyQuoteReadOnly as verify} from "../cloudflare/guesty-quote-readonly.js";
const input={quoteId:"a".repeat(24),listingId:"b".repeat(24),checkIn:"2027-01-14",checkOut:"2027-01-18",guests:6,token:"test-token",now:Date.parse("2026-11-08T18:00:00Z")};
const quote={_id:input.quoteId,unitTypeId:input.listingId,checkInDateLocalized:input.checkIn,checkOutDateLocalized:input.checkOut,guestsCount:6,status:"valid",createdAt:"2026-11-08T17:00:00Z",expiresAt:"2026-11-09T17:00:00Z"};
let calls=0;
const transport=async(url,options)=>{calls++;assert.equal(options.method,"GET");assert.equal(url,"https://open-api.guesty.com/v1/quotes/"+input.quoteId);return {ok:true,status:200,json:async()=>quote}};
assert.deepEqual(await verify({...input,transport}),{verified:true,reason:"verified_read_only",quoteId:input.quoteId,listingId:input.listingId,writeAuthorized:false});
for(const [change,reason] of [
 [{_id:"c".repeat(24)},"quote_identity_mismatch"],
 [{unitTypeId:"c".repeat(24)},"quote_listing_mismatch"],
 [{checkInDateLocalized:"2027-01-15"},"quote_dates_mismatch"],
 [{guestsCount:7},"quote_guests_mismatch"],
 [{status:"expired"},"quote_not_valid"],
 [{expiresAt:"2026-11-08T17:00:00Z"},"quote_freshness_unverified"]
]){const result=await verify({...input,transport:async()=>({ok:true,status:200,json:async()=>({...quote,...change}})});assert.equal(result.reason,reason);}
for(const [status,reason] of [[404,"quote_not_found_in_open_api"],[410,"quote_expired"],[401,"quote_lookup_rejected"]]){
 assert.equal((await verify({...input,transport:async()=>({ok:false,status})})).reason,reason);
}
assert.equal((await verify({...input,transport:async()=>{throw Error("network")}})).verified,false);
assert.equal((await verify({...input,quoteId:"invalid",transport})).verified,false);
assert.equal(calls,1);
console.log("PASS: Guesty Open API quote read-only verification checks identity, listing, dates, guests, status and expiry; never authorizes writes.");
