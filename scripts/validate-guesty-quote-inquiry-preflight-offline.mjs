import assert from "node:assert/strict";
import {preflightStoredBookingQuote as preflight} from "../cloudflare/guesty-quote-inquiry-preflight.js";
const quoteId="a".repeat(24),listingId="b".repeat(24),now=Date.parse("2026-11-08T18:00:00Z");
const record={guesty_sync_status:"pending",guesty_sync_claim_token:null,guesty_sync_attempt_count:0,
 request_idempotency_key:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
 request_payload_fingerprint:"c".repeat(64),guesty_quote_id:quoteId,
 check_in:"2027-01-14",check_out:"2027-01-18",guests:6};
const quote={_id:quoteId,unitTypeId:listingId,checkInDateLocalized:record.check_in,
 checkOutDateLocalized:record.check_out,guestsCount:6,status:"valid",
 createdAt:"2026-11-08T17:00:00Z",expiresAt:"2026-11-09T17:00:00Z"};
let requests=0;
const transport=async(url,opts)=>{requests++;assert.equal(opts.method,"GET");
 return {ok:true,status:200,json:async()=>quote};};
const args={record,listingId,token:"test-token",transport,now};
const result=await preflight(args);
assert.equal(result.quoteReadOnlyVerified,true);
assert.equal(result.readyForInquiry,false);
assert.equal(result.writeAuthorized,false);
assert.equal(result.retryAutomatically,false);
assert.equal(requests,1);
for(const bad of [
 {...record,guesty_sync_status:"succeeded"},
 {...record,guesty_sync_claim_token:"claimed"},
 {...record,guesty_sync_attempt_count:1},
 {...record,request_idempotency_key:null},
 {...record,request_payload_fingerprint:"invalid"}
]) {
 const r=await preflight({...args,record:bad});
 assert.equal(r.readyForInquiry,false);
 assert.equal(r.writeAuthorized,false);
}
assert.equal(requests,1,"blocked records must not contact Guesty");
const mismatched=await preflight({...args,transport:async()=>({ok:true,status:200,json:async()=>({...quote,guestsCount:7})})});
assert.equal(mismatched.reason,"quote_guests_mismatch");
assert.equal(mismatched.writeAuthorized,false);
console.log("PASS: stored request quote preflight only reads and always blocks Guesty writes.");
