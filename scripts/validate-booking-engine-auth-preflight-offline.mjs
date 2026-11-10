import assert from "node:assert/strict";
import {assessInternalInquiryRequest as assess} from "../cloudflare/guesty-booking-engine-auth-preflight.js";
const key="a".repeat(40),env={ZYEN_INQUIRY_ADMIN_KEY:key};
const request=(method="POST",token=key,path="/api/internal/guesty/inquiry",type="application/json")=>
 new Request("https://example.com"+path,{method,headers:{"Content-Type":type,
 ...(token===null?{}:{"X-Zyen-Inquiry-Admin-Key":token})}});
const good=assess({request:request(),env});
assert.equal(good.authenticated,true);assert.equal(good.authorized,false);
assert.equal(good.canWrite,false);assert.equal(good.canClaim,false);
for(const [req,environment,reason] of [
 [request("GET"),env,"method_not_allowed"],
 [request("POST",key,"/api/public/booking-request"),env,"route_mismatch"],
 [request("POST",key,"/api/internal/guesty/inquiry","text/plain"),env,"json_required"],
 [request("POST",null),env,"admin_authentication_required"],
 [request("POST","wrong"),env,"admin_authentication_required"],
 [request(),{},"admin_authentication_required"],
 [request(),{ZYEN_INQUIRY_ADMIN_KEY:"short"},"admin_authentication_required"]
]){const result=assess({request:req,env:environment});assert.equal(result.reason,reason);
 assert.equal(result.canWrite,false);assert.equal(result.canClaim,false);}
console.log("PASS: internal inquiry preflight authenticates only and never grants write access.");
