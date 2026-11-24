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
assert.equal(disabled.status,403);assert.equal((await disabled.json()).code,"LIVE_TEST_DISABLED");
assert.equal((await createLocalMockHarness()()).state,"blocked");
let touched=0;
const run=createLocalMockHarness({db:{prepare(){touched++;throw Error("unexpected")}},readQuote:async()=>{touched++},transport:async()=>{touched++},approval:{requestId:"request-001",attemptId:"attempt-001",expiresAt:"invalid"},now:0});
assert.equal((await run()).state,"blocked");assert.equal(touched,0);
