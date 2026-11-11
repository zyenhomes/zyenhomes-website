import assert from "node:assert/strict";
import {submitGuestyInquiryControlled as submit} from "../cloudflare/guesty-booking-engine-controlled-transport.js";
import {prepareBookingEngineInquiry} from "../cloudflare/guesty-booking-engine-inquiry.js";
const quoteId="a".repeat(24),ratePlanId="b".repeat(24),reservationId="c".repeat(24);
const prepared=prepareBookingEngineInquiry({quoteId,ratePlanId,firstName:"Test",lastName:"Guest",email:"test@example.com"});
const claim={claimed:true,claimCommitted:true,auditCommitted:true,canSendInquiry:false,
 requestId:"request_id_123456",attemptId:"attempt_id_123456"};
const authorization={explicitLiveWriteApproval:true,approvedRequestId:claim.requestId,
 approvedAttemptId:claim.attemptId,approvedQuoteId:quoteId};
let calls=0;
const transport=async(url,opts)=>{calls++;assert.equal(url,prepared.endpoint);
 assert.equal(opts.method,"POST");assert.equal(JSON.parse(opts.body).ratePlanId,ratePlanId);
 assert.equal(JSON.parse(opts.body).ccToken,undefined);
 return {status:200,json:async()=>({_id:reservationId,status:"reserved"})};};
const args={prepared,claim,authorization,token:"mock_token_123",transport};
for(const change of [
 {authorization:undefined},{authorization:{...authorization,approvedQuoteId:"d".repeat(24)}},
 {claim:{...claim,auditCommitted:false}},{claim:{...claim,claimed:false}},
 {prepared:{...prepared,endpoint:"https://evil.example/"}},
 {token:""}
]){const result=await submit({...args,...change});
 assert.equal(result.state,"blocked");assert.equal(result.retryAutomatically,false);}
assert.equal(calls,0);
const accepted=await submit(args);
assert.equal(calls,1);assert.equal(accepted.state,"needs_reconciliation");
assert.equal(accepted.reservationId,reservationId);
assert.equal(accepted.canMarkSucceeded,false);assert.equal(accepted.retryAutomatically,false);
const timeout=await submit({...args,transport:async()=>{throw Error("timeout")}});
assert.equal(timeout.state,"uncertain");assert.equal(timeout.retryAutomatically,false);
const failed=await submit({...args,transport:async()=>({status:502,json:async()=>({})})});
assert.equal(failed.state,"uncertain");assert.equal(failed.canMarkSucceeded,false);
console.log("PASS: controlled transport fails closed; mock POST requires explicit scoped approval, never marks success.");
