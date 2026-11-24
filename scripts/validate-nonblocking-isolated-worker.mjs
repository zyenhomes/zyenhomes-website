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

const {createIsolatedRuntime}=await import("../cloudflare/guesty-nonblocking-runtime-candidate.js");
const {runIsolatedLiveCandidate}=await import("../cloudflare/guesty-nonblocking-live-orchestration.js");
const {executeIsolatedInquiry}=await import("../cloudflare/guesty-nonblocking-execution-candidate.js");
let accesses=0;const forbidden=()=>{accesses++;throw Error("unexpected access")};
const enabled={GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true",get ISOLATED_BOOKING_DB(){return forbidden()}};
assert.equal(createIsolatedRuntime(enabled,forbidden),null);
assert.equal((await runIsolatedLiveCandidate({env:enabled,readQuote:forbidden,getToken:forbidden,transport:forbidden})).reason,"execution_disabled");
assert.equal((await executeIsolatedInquiry({env:enabled,transport:forbidden})).reason,"execution_disabled");
assert.equal(accesses,0);

const {executeWithInjectedTransport}=await import("../cloudflare/guesty-nonblocking-execution-candidate.js");
const payload={quoteId:"1234567890abcdef12345678",ratePlanId:"default-rateplan-id",status:"inquiry",ignoreCalendar:false,ignoreTerms:false,ignoreBlocks:false,guest:{firstName:"Test",lastName:"Guest",email:"test@example.invalid",phones:["+14165550100"]}};
let sent=0;
const mock=async(url,opts)=>{sent++;assert.equal(url,"https://open-api.guesty.com/v1/reservations-v3/quote");assert.equal(opts.redirect,"error");assert.ok(opts.signal);assert.deepEqual(JSON.parse(opts.body),payload);return {status:200,json:async()=>({_id:"1234567890abcdef12345678"})}};
assert.equal((await executeWithInjectedTransport({body:payload,token:"mock",transport:mock})).state,"needs_verification");
for(const extra of [{status:"confirmed"},{reservedUntil:-1},{ignoreCalendar:true}])assert.equal((await executeWithInjectedTransport({body:{...payload,...extra},token:"mock",transport:mock})).state,"blocked");
assert.equal(sent,1);
assert.equal((await executeWithInjectedTransport({body:payload,token:"mock",transport:async()=>{throw Error("timeout")}})).state,"uncertain");
