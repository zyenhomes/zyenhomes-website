import assert from "node:assert/strict";
import {BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED,bookingEngineInquiryDependencies,
 handleDisabledBookingEngineInquiry} from "../cloudflare/guesty-booking-engine-route.js";
assert.equal(BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED,false);
assert.equal(typeof bookingEngineInquiryDependencies.assessControlledInquirySubmission,"function");
let accesses=0;
const key="a".repeat(40);
const env={ZYEN_INQUIRY_ADMIN_KEY:key,
 get GUESTY_CLIENT_SECRET(){accesses++;throw Error("credentials must not be accessed");},
 get BOOKING_REQUESTS_DB(){accesses++;throw Error("D1 must not be accessed");}};
const url="https://example.com/api/internal/guesty/inquiry";
for(const [token,expectedStatus] of [[key,503],["invalid",401]]){
 const response=handleDisabledBookingEngineInquiry(new Request(url,{method:"POST",
 headers:{"Content-Type":"application/json","X-Zyen-Inquiry-Admin-Key":token}}),env);
 assert.equal(response.status,expectedStatus);
 assert.equal(response.headers.get("Cache-Control"),"no-store");
}
assert.equal(accesses,0);
console.log("PASS: controlled preflight is linked but disabled Worker route never invokes it.");
