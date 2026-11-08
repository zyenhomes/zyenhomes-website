import assert from "node:assert/strict";
import {createBookingRequestTransport,BOOKING_REQUEST_API_URL} from "../booking-request-transport.mjs";
const request={requestKey:"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",propertyId:"149-tyrolean"};
let sent=0;
const transport=createBookingRequestTransport({fetchImpl:async (url,opts)=>{
 sent++;assert.equal(url,BOOKING_REQUEST_API_URL);assert.equal(opts.method,"POST");
 assert.equal(opts.credentials,"omit");assert.equal(opts.redirect,"error");
 assert.equal(JSON.parse(opts.body).requestKey,request.requestKey);
 return {status:201,json:async()=>({success:true,requestId:"req-1",status:"received"})};
}});
assert.deepEqual(await transport(request),{submitted:true,requestId:"req-1",confirmedReservation:false,duplicate:false});
assert.equal(sent,1);
for(const [status,reason] of [[409,"conflict_review_details"],[503,"booking_api_unavailable"],[500,"manual_review"]]){
 const fn=createBookingRequestTransport({fetchImpl:async()=>({status,json:async()=>({success:false})})});
 assert.equal((await fn(request)).reason,reason);
}
const lost=createBookingRequestTransport({fetchImpl:async()=>{throw Error("network failure")}});
assert.deepEqual(await lost(request),{submitted:false,reason:"uncertain_manual_review",retryAutomatically:false});
const invalid=createBookingRequestTransport({fetchImpl:async()=>({status:201,json:async()=>({success:true,status:"confirmed",requestId:"r"})})});
assert.equal((await invalid(request)).submitted,false);
await assert.rejects(transport({...request,requestKey:"short"}));
assert.equal(sent,1);
assert.throws(()=>createBookingRequestTransport({fetchImpl:async()=>{},endpoint:"https://example.invalid/"}));
console.log("PASS: offline transport uses fixed endpoint, no automatic retry, and never asserts confirmed reservation.");
