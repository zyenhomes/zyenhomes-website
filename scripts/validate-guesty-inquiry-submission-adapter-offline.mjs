import assert from "node:assert/strict";
import { prepareGuestyInquiry, classifyGuestyInquiryResponse, simulateGuestyInquirySubmission } from "./guesty-inquiry-submission-adapter-offline.mjs";

const guest = {
  quoteId: "6adb5d7320cb330ec34a3507",
  firstName: "Jane", lastName: "Test", email: "jane@example.invalid",
  phones: ["+14165550101"], status: "confirmed", ignoreCalendar: true
};
const prepared = prepareGuestyInquiry(guest);
assert.equal(prepared.productionEnabled, false);
assert.equal(prepared.method, "POST");
assert.equal(prepared.endpoint, "https://open-api.guesty.com/v1/reservations-v3/quote");
assert.deepEqual(Object.keys(prepared.payload).sort(), ["guest","quoteId","reservedUntil","status"]);
assert.equal(prepared.payload.status,"inquiry");
assert.equal(prepared.payload.reservedUntil,-1);
assert.equal("ignoreCalendar" in prepared.payload,false);
assert.equal(prepared.payload.guest.firstName,"Jane");

let calls=0;
const success=await simulateGuestyInquirySubmission(guest,async request => {
  calls++;
  assert.equal(request.body.status,"inquiry");
  assert.equal(request.body.guest.email,"jane@example.invalid");
  return {status:201,body:{_id:"6adb5d7320cb330ec34a3507"}};
});
assert.equal(calls,1);
assert.equal(success.state,"needs_verification");
assert.equal(success.retryAutomatically,false);
for (const response of [
  {status:201,body:{}},
  {status:500,body:{}},
  {status:502,body:{_id:"6adb5d7320cb330ec34a3507"}},
  {status:409,body:{}},
  {status:401,body:{}},
  {status:200,body:{reservationId:"invalid"}},
  {transportError:true}
]) {
  const outcome=classifyGuestyInquiryResponse(response);
  assert.equal(outcome.retryAutomatically,false);
  assert.notEqual(outcome.state,"succeeded");
}
assert.equal((await simulateGuestyInquirySubmission(guest,async()=>{throw Error("timeout")})).state,"uncertain");
assert.throws(()=>prepareGuestyInquiry({...guest,quoteId:"invalid"}));
assert.throws(()=>prepareGuestyInquiry({...guest,phones:["4165550101"]}));

// Verify the production-capable adapter stays disabled unless all independent
// server-side safeguards are explicitly enabled. All transports are mocked.
const { submitGuestyInquiry } = await import("../cloudflare/guesty-inquiry-submit.js");
const enabled = {
  GUESTY_INQUIRY_WRITES_ENABLED: "true",
  GUESTY_INQUIRY_WRITE_PERMISSION_VERIFIED: "true",
  GUESTY_INQUIRY_RECONCILIATION_READY: "true"
};
let networkAttempts = 0;
const mockedTransport = async (url, options) => {
  networkAttempts++;
  assert.equal(url, prepared.endpoint);
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer offline-test-token");
  assert.equal(JSON.parse(options.body).status, "inquiry");
  return { status: 201, json: async () => ({ _id: "6adb5d7320cb330ec34a3507" }) };
};
for (const [env, state] of [
  [{}, "disabled"],
  [{ ...enabled, GUESTY_INQUIRY_WRITES_ENABLED: "false" }, "disabled"],
  [{ ...enabled, GUESTY_INQUIRY_WRITE_PERMISSION_VERIFIED: "false" }, "permission_unverified"],
  [{ ...enabled, GUESTY_INQUIRY_RECONCILIATION_READY: "false" }, "reconciliation_unverified"]
]) {
  const result = await submitGuestyInquiry({ input: guest, token: "offline-test-token", env, transport: mockedTransport });
  assert.equal(result.state, state);
  assert.equal(result.retryAutomatically, false);
}
assert.equal(networkAttempts, 0, "disabled paths must never attempt a network request");
const submitted = await submitGuestyInquiry({ input: guest, token: "offline-test-token", env: enabled, transport: mockedTransport });
assert.equal(submitted.state, "needs_verification");
assert.equal(submitted.retryAutomatically, false);
assert.equal(networkAttempts, 1);
const uncertain = await submitGuestyInquiry({ input: guest, token: "offline-test-token", env: enabled, transport: async () => { throw Error("timeout"); } });
assert.equal(uncertain.state, "uncertain");
assert.equal(uncertain.retryAutomatically, false);

console.log("PASS: offline inquiry payload always uses inquiry status and never automatically retries or verifies writes.");
