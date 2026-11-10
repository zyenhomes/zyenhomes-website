import assert from "node:assert/strict";
import {handleDisabledBookingEngineInquiry,BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED}
 from "../cloudflare/guesty-booking-engine-route.js";
assert.equal(BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED,false);
const key="a".repeat(40),url="https://example.com/api/internal/guesty/inquiry";
let touched=0;
const env={ZYEN_INQUIRY_ADMIN_KEY:key,
 get GUESTY_CLIENT_SECRET(){touched++;throw Error("token access prohibited");},
 get BOOKING_REQUESTS_DB(){touched++;throw Error("D1 access prohibited");}};
const request=(method,token,contentType="application/json")=>
 new Request(url,{method,headers:{"Content-Type":contentType,...(token?{"X-Zyen-Inquiry-Admin-Key":token}:{})}});
const cases=[
 [request("POST",key),503,"INQUIRY_SUBMISSION_DISABLED"],
 [request("POST","wrong"),401,"INQUIRY_REQUEST_REJECTED"],
 [request("POST",null),401,"INQUIRY_REQUEST_REJECTED"],
 [request("GET",key),405,"INQUIRY_REQUEST_REJECTED"],
 [request("POST",key,"text/plain"),415,"INQUIRY_REQUEST_REJECTED"]
];
for(const [req,status,code] of cases){
 const response=handleDisabledBookingEngineInquiry(req,env);
 assert.equal(response.status,status);
 assert.equal((await response.json()).code,code);
 assert.equal(response.headers.get("Cache-Control"),"no-store");
}
assert.equal(touched,0);
console.log("PASS: disabled Worker route rejects unauthenticated requests; authenticated remains 503, no D1/token.");
