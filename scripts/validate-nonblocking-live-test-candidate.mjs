import assert from "node:assert/strict";
import {prepareLiveTestTransport as prepare,LIVE_TEST_TRANSPORT_ENABLED} from "../cloudflare/guesty-nonblocking-live-test-candidate.js";
const fixture=()=>({env:{GUESTY_ISOLATED_INQUIRY_TEST_ENABLED:"true"},requestId:"request-001",attemptId:"attempt-001",quoteId:"1234567890abcdef12345678",approval:{approved:true,requestId:"request-001",attemptId:"attempt-001",quoteId:"1234567890abcdef12345678"},body:{quoteId:"1234567890abcdef12345678",status:"inquiry",ratePlanId:"default-rateplan-id",ignoreCalendar:false,ignoreTerms:false,ignoreBlocks:false,guest:{firstName:"Test",lastName:"Guest",email:"test@example.com",phones:["+14165550100"]}}});
assert.equal(LIVE_TEST_TRANSPORT_ENABLED,false);
assert.equal(prepare(fixture()).reason,"compile_time_live_transport_disabled");
for(const [mutate,reason] of [[f=>f.env.GUESTY_ISOLATED_INQUIRY_TEST_ENABLED="false","test_disabled"],[f=>f.approval.attemptId="other","approval_mismatch"],[f=>f.body.status="confirmed","unsafe_payload"],[f=>f.body.ignoreCalendar=true,"unsafe_payload"],[f=>f.body.reservedUntil=-1,"unexpected_payload_field"],[f=>f.body.guest.payment="bad","unexpected_guest_field"]]){
 const f=fixture();mutate(f);const r=prepare(f);assert.equal(r.allowed,false);assert.equal(r.retryAutomatically,false);assert.equal(r.reason,reason);
}
console.log("PASS: isolated live-test boundary remains disabled");
