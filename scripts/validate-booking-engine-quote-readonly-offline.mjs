import assert from "node:assert/strict";
import {retrieveBookingEngineQuoteReadOnly as retrieve} from "../cloudflare/guesty-booking-engine-quote-readonly.js";
const id="a".repeat(24),token="secret_token_12345";
const quote={_id:id,rates:{ratePlans:[{ratePlan:{_id:"b".repeat(24)}}]}};
let calls=0;
const transport=async(url,options)=>{calls++;assert.equal(url,
 "https://booking.guesty.com/api/reservations/quotes/"+id);
 assert.equal(options.method,"GET");assert.equal(options.headers.Authorization,"Bearer "+token);
 assert.equal(options.body,undefined);return {ok:true,json:async()=>({results:quote})};};
const good=await retrieve({quoteId:id,token,transport});
assert.equal(good.verified,true);assert.equal(good.writeAuthorized,false);
assert.equal(good.quote._id,id);assert.equal(calls,1);
const bads=[
 {quoteId:"invalid",token,transport},
 {quoteId:id,token:"",transport},
 {quoteId:id,token,transport:async()=>{throw Error("timeout");}},
 {quoteId:id,token,transport:async()=>({ok:false,status:429})},
 {quoteId:id,token,transport:async()=>({ok:true,json:async()=>{throw Error("invalid");}})},
 {quoteId:id,token,transport:async()=>({ok:true,json:async()=>({_id:"c".repeat(24),rates:quote.rates})})},
 {quoteId:id,token,transport:async()=>({ok:true,json:async()=>({...quote,rates:{ratePlans:[]}})})}
];
for(const args of bads){const r=await retrieve(args);assert.equal(r.verified,false);assert.equal(r.writeAuthorized,false);}
console.log("PASS: read-only quote lookup verifies exact identity and rate plans, never POSTs.");
