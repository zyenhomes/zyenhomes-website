import assert from "node:assert/strict";
import {createBookingFormApiBridge,BOOKING_FORM_API_SUBMISSION_ENABLED} from "../booking-form-api-bridge.mjs";
import {readFileSync} from "node:fs";
assert.equal(BOOKING_FORM_API_SUBMISSION_ENABLED,false);
let calls=0;
const bridge=createBookingFormApiBridge({fetchImpl:async()=>{calls++;throw Error("Forbidden network call");}});
const input={propertyId:"149-tyrolean",name:"Test Guest",email:"guest@example.invalid",phone:"+14165550123",checkIn:"2027-01-14",checkOut:"2027-01-18",guests:6,message:"",marketingConsent:false};
assert.deepEqual(await bridge.submit(input),{submitted:false,reason:"booking_form_api_disabled"});
assert.deepEqual(await bridge.submit(input),{submitted:false,reason:"booking_form_api_disabled"});
assert.equal(calls,0);
const code=readFileSync("booking-form-api-bridge.mjs","utf8");
assert.match(code,/createBookingRequestTransport\(\{fetchImpl\}\)/);
assert.match(code,/if \(BOOKING_FORM_API_SUBMISSION_ENABLED !== true\)/);
assert.ok(code.indexOf("BOOKING_FORM_API_SUBMISSION_ENABLED !== true")<code.indexOf("createBookingRequestTransport({fetchImpl})"));
for(const file of ["zyen-connected-calendar.js","zyen-116-calendar-pilot.js"]){
 const html=readFileSync(file,"utf8");
 assert.match(html,/createBookingFormApiBridge\(\)\.submit\(apiDraft\)/);
 assert.match(html,/mailto:info@zyenhomes\.com/);
 assert.doesNotMatch(html,/fetch\([^\n]*\/api\/public\/booking-request/);
}
console.log("PASS: transport is connected behind hard-disabled gate; both email forms remain intact.");
