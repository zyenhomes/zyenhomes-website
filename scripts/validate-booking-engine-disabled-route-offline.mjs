import assert from "node:assert/strict";
import {BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED,bookingEngineInquiryDependencies,
 handleDisabledBookingEngineInquiry} from "../cloudflare/guesty-booking-engine-route.js";
assert.equal(BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED,false);
assert.equal(typeof bookingEngineInquiryDependencies.reviewBookingEngineInquiryClaim,"function");
assert.equal(typeof bookingEngineInquiryDependencies.assessInquiryLifecycle,"function");
let calls=0;
const env={get GUESTY_CLIENT_SECRET(){calls++;throw Error("must not access credentials");},
 get BOOKING_REQUESTS_DB(){calls++;throw Error("must not access D1");}};
const response=handleDisabledBookingEngineInquiry(new Request("https://example.com/api/internal/guesty/inquiry",{method:"POST"}),env);
assert.equal(response.status,503);assert.equal(calls,0);
const body=await response.json();
assert.equal(body.code,"INQUIRY_SUBMISSION_DISABLED");
console.log("PASS: production route scaffold remains disabled and cannot access credentials or D1.");
