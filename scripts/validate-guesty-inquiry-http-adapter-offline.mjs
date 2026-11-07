import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { submitGuestyInquiry } from "../cloudflare/guesty-inquiry-submit.js";

const input = {
  quoteId:"6adb5d7320cb330ec34a3507", firstName:"Jane",
  lastName:"Test", email:"jane@example.invalid", phones:["+14165550101"],
  status:"confirmed", ignoreCalendar:true
};
const enabled = {
  GUESTY_INQUIRY_WRITES_ENABLED:"true",
  GUESTY_INQUIRY_WRITE_PERMISSION_VERIFIED:"true",
  GUESTY_INQUIRY_RECONCILIATION_READY:"true"
};
let calls=0;
const transport=async (url, init) => {
  calls++;
  assert.equal(url,"https://open-api.guesty.com/v1/reservations-v3/quote");
  assert.equal(init.method,"POST");
  assert.equal(init.headers.Authorization,"Bearer local-test-token");
  const body=JSON.parse(init.body);
  assert.equal(body.status,"inquiry");
  assert.equal(body.reservedUntil,-1);
  assert.equal("ignoreCalendar" in body,false);
  return { status:201, json:async()=>({_id:"6adb5d7320cb330ec34a3507"}) };
};
const opts={input,token:"local-test-token",transport};
assert.equal((await submitGuestyInquiry({...opts,env:{}})).state,"disabled");
assert.equal((await submitGuestyInquiry({...opts,env:{GUESTY_INQUIRY_WRITES_ENABLED:"true"}})).state,"permission_unverified");
assert.equal((await submitGuestyInquiry({...opts,env:{...enabled,GUESTY_INQUIRY_RECONCILIATION_READY:"false"}})).state,"reconciliation_unverified");
assert.equal((await submitGuestyInquiry({...opts,env:enabled,token:""})).state,"configuration_error");
assert.equal(calls,0);
const result=await submitGuestyInquiry({...opts,env:enabled});
assert.equal(result.state,"needs_verification");
assert.equal(result.retryAutomatically,false);
assert.equal(calls,1);
for (const response of [
  {status:500,json:async()=>({})},
  {status:201,json:async()=>({})},
  {status:409,json:async()=>({})},
  {status:200,json:async()=>{throw Error("invalid json")}}
]) {
  const outcome=await submitGuestyInquiry({...opts,env:enabled,transport:async()=>response});
  assert.equal(outcome.retryAutomatically,false);
  assert.notEqual(outcome.state,"succeeded");
}
assert.equal((await submitGuestyInquiry({...opts,env:enabled,transport:async()=>{throw Error("timeout")}})).state,"uncertain");
assert.equal(calls,1);
const worker=readFileSync("cloudflare/worker.js","utf8");
assert.doesNotMatch(worker,/guesty-inquiry-submit\.js/);
console.log("PASS: HTTP adapter is unwired, disabled by default and requires three explicit gates.");
console.log("LIMITATION: all transport responses are mocked; Guesty permissions and live behavior are unverified.");
