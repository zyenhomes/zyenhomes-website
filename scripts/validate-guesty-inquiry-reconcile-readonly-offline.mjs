import assert from "node:assert/strict";
import {reconcileGuestyInquiryReadOnly as reconcile} from "../cloudflare/guesty-inquiry-reconcile-readonly.js";
const reservationId="a".repeat(24),quoteId="b".repeat(24),listingId="c".repeat(24);
const base={reservationId,quoteId,listingId,token:"mock",transport:async(url,opts)=>{
 assert.equal(opts.method,"GET");assert.equal(url,"https://open-api.guesty.com/v1/reservations-v3/"+reservationId);
 return {ok:true,json:async()=>({_id:reservationId,status:"inquiry",quoteId,listingId,guest:{email:"private@example.com"}})};
}};
const ok=await reconcile(base);
assert.equal(ok.verified,true);assert.equal(ok.canMarkSucceeded,false);assert.equal(ok.retryAutomatically,false);
for(const value of [
 {_id:"d".repeat(24)}, {status:"confirmed"}, {quoteId:"d".repeat(24)}, {listingId:"d".repeat(24)}
]) {
 const r=await reconcile({...base,transport:async()=>({ok:true,json:async()=>({_id:reservationId,status:"inquiry",quoteId,listingId,...value})})});
 assert.equal(r.verified,false);assert.equal(r.retryAutomatically,false);
}
assert.equal((await reconcile({...base,transport:async()=>{throw Error("timeout")}})).verified,false);
assert.equal((await reconcile({...base,reservationId:"invalid"})).verified,false);
assert.ok(!JSON.stringify(ok).includes("private@example.com"));
console.log("PASS: read-only inquiry reconciliation fails closed, never retries or marks success.");
