import assert from "node:assert/strict";
import {createBookingRequestDraftSession} from "../booking-request-draft.mjs";
import {fingerprintBookingRequest} from "./guesty-booking-request-idempotency-offline.mjs";
import {createBookingRequestTransport} from "../booking-request-transport.mjs";
import {createBookingFormApiBridge,BOOKING_FORM_API_SUBMISSION_ENABLED} from "../booking-form-api-bridge.mjs";

const input={propertyId:"149-tyrolean",name:"Example Guest",email:"EXAMPLE@example.invalid",
 phone:"+14165550123",checkIn:"2027-01-14",checkOut:"2027-01-18",
 guests:6,message:"Please confirm",marketingConsent:false};
let seq=0;
const fakeCrypto={randomUUID:()=> "aaaaaaaa-bbbb-4ccc-8ddd-"+String(++seq).padStart(12,"0")};
const draft=createBookingRequestDraftSession({fingerprint:fingerprintBookingRequest,cryptoApi:fakeCrypto});
const first=await draft.prepare(input);
const retry=await draft.prepare({...input,email:"example@example.invalid"});
assert.equal(first.requestKey,retry.requestKey,"same details must reuse key");
assert.notEqual(first.requestKey,(await draft.prepare({...input,guests:7})).requestKey,"changed details must rotate key");

let calls=0;
const responses=[
 {status:201,json:async()=>({success:true,status:"received",requestId:"req-123"})},
 {status:200,json:async()=>({success:true,status:"received",requestId:"req-123"})},
 {status:409,json:async()=>({success:false})},
 {status:503,json:async()=>({success:false})}
];
const transport=createBookingRequestTransport({fetchImpl:async(url,opts)=>{
 calls++;
 assert.equal(opts.method,"POST");
 assert.equal(opts.credentials,"omit");
 assert.equal(opts.redirect,"error");
 assert.equal(JSON.parse(opts.body).requestKey,first.requestKey);
 return responses.shift();
}});
const created=await transport(first);
assert.deepEqual(created,{submitted:true,requestId:"req-123",confirmedReservation:false,duplicate:false});
const duplicate=await transport(first);
assert.deepEqual(duplicate,{submitted:true,requestId:"req-123",confirmedReservation:false,duplicate:true});
assert.equal((await transport(first)).reason,"conflict_review_details");
assert.equal((await transport(first)).reason,"booking_api_unavailable");
assert.equal(calls,4);
const lost=createBookingRequestTransport({fetchImpl:async()=>{throw Error("response lost");}});
assert.deepEqual(await lost(first),{submitted:false,reason:"uncertain_manual_review",retryAutomatically:false});

assert.equal(BOOKING_FORM_API_SUBMISSION_ENABLED,false);
let forbidden=0;
const liveBridge=createBookingFormApiBridge({fetchImpl:async()=>{forbidden++;throw Error("must not contact network")}});
assert.deepEqual(await liveBridge.submit(input),{submitted:false,reason:"booking_form_api_disabled"});
assert.equal(forbidden,0);
console.log("PASS: simulated end-to-end draft -> transport responses, duplicate handling, no reservation confirmation, and live gate disabled.");
