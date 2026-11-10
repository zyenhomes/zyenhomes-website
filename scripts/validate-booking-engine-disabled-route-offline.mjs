import assert from "node:assert/strict";
import {BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED,bookingEngineInquiryDependencies,
 handleDisabledBookingEngineInquiry} from "../cloudflare/guesty-booking-engine-route.js";
assert.equal(BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED,false);
assert.equal(typeof bookingEngineInquiryDependencies.reviewBookingEngineInquiryClaim,"function");
assert.equal(typeof bookingEngineInquiryDependencies.assessInquiryLifecycle,"function");
let calls=0;
const key="a".repeat(40);
const env={ZYEN_INQUIRY_ADMIN_KEY:key,
 get GUESTY_CLIENT_SECRET(){calls++;throw Error("must not access credentials");},
 get BOOKING_REQUESTS_DB(){calls++;throw Error("must not access D1");}};
const url="https://example.com/api/internal/guesty/inquiry";
const authorized=new Request(url,{method:"POST",headers:{
 "Content-Type":"application/json","X-Zyen-Inquiry-Admin-Key":key}});
const response=handleDisabledBookingEngineInquiry(authorized,env);
assert.equal(response.status,503);
assert.equal((await response.json()).code,"INQUIRY_SUBMISSION_DISABLED");
const unauthorized=new Request(url,{method:"POST",headers:{"Content-Type":"application/json"}});
const rejected=handleDisabledBookingEngineInquiry(unauthorized,env);
assert.equal(rejected.status,401);
assert.equal((await rejected.json()).code,"INQUIRY_REQUEST_REJECTED");
assert.equal(calls,0);
console.log("PASS: authenticated route stays disabled; unauthenticated denied; no Guesty or D1 access.");
