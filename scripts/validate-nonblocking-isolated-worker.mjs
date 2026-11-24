import assert from "node:assert/strict";
import worker from "../cloudflare/guesty-nonblocking-isolated-worker-candidate.js";
const base="https://isolated.invalid";
const r=await worker.fetch(new Request(base));
assert.equal(r.status,200);assert.equal((await r.json()).liveWritesEnabled,false);
for(const path of ["/","/internal/inquiry","/api/booking-request","/internal/quote-create-test"]){
 const r=await worker.fetch(new Request(base+path,{method:"POST",body:"{}"}),{GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true"});
 assert.equal(r.status,403);
}
console.log("PASS: isolated candidate denies all writes");
