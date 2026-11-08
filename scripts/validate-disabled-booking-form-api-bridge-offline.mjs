import assert from "node:assert/strict";
import {createBookingFormApiBridge,BOOKING_FORM_API_SUBMISSION_ENABLED} from "../booking-form-api-bridge.mjs";
assert.equal(BOOKING_FORM_API_SUBMISSION_ENABLED,false);
let calls=0;
const bridge=createBookingFormApiBridge({transport:()=>{calls++;throw Error("must not send")}});
const result=await bridge.submit({propertyId:"149-tyrolean",name:"Test"});
assert.deepEqual(result,{submitted:false,reason:"booking_form_api_disabled"});
assert.equal(calls,0);
console.log("PASS: booking form API bridge cannot send while hard-disabled.");
