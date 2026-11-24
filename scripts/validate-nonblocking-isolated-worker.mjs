import assert from "node:assert/strict";
import worker, {createLocalMockHarness,LIVE_EXECUTION_ENABLED} from "../cloudflare/guesty-nonblocking-isolated-worker-candidate.js";
const base="https://isolated.invalid";
const r=await worker.fetch(new Request(base));
assert.equal(r.status,200);assert.equal((await r.json()).liveWritesEnabled,false);
for(const path of ["/","/internal/inquiry","/api/booking-request","/internal/quote-create-test"]){
 const r=await worker.fetch(new Request(base+path,{method:"POST",body:"{}"}),{GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true"});
 assert.equal(r.status,403);
}
console.log("PASS: isolated candidate denies all writes");

assert.equal(LIVE_EXECUTION_ENABLED,false);
const disabled=await worker.fetch(new Request(base+"/internal/inquiry-test",{method:"POST",body:"{}"}),{GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true",GUESTY_TEST_MODE:"live"});
assert.equal(disabled.status,401);assert.equal((await disabled.json()).code,"NOT_AUTHORIZED");
assert.equal((await createLocalMockHarness()()).state,"blocked");
let touched=0;
const run=createLocalMockHarness({db:{prepare(){touched++;throw Error("unexpected")}},readQuote:async()=>{touched++},transport:async()=>{touched++},approval:{requestId:"request-001",attemptId:"attempt-001",expiresAt:"invalid"},now:0});
assert.equal((await run()).state,"blocked");assert.equal(touched,0);

const token="x".repeat(64);
const env={GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true",GUESTY_QUOTE_DIAGNOSTIC_ACCESS_TOKEN:token};
for(const [auth,status,code] of [["Bearer wrong",401,"NOT_AUTHORIZED"],["Bearer "+token,403,"LIVE_EXECUTION_DISABLED"]]){
 const response=await worker.fetch(new Request(base+"/internal/inquiry-test",{method:"POST",headers:{Authorization:auth}}),env);
 assert.equal(response.status,status);assert.equal((await response.json()).code,code);
}
