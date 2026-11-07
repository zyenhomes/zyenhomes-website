import assert from "node:assert/strict";
import { planInquiryOrchestration, planPostSubmission } from "./guesty-inquiry-orchestration-offline.mjs";

const record = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  quoteId: "6adb5d7320cb330ec34a3507",
  listingId: "6abf9b85caf2480012c82479",
  verifiedListingId: "6abf9b85caf2480012c82479",
  checkIn: "2027-01-14", checkOut: "2027-01-18",
  guests: 6, guestySyncStatus: "pending"
};
const guest = { firstName: "Jane", lastName: "Test", email: "jane@example.invalid", phones: ["+14165550101"] };
const pending = planInquiryOrchestration({record,guest});
assert.equal(pending.ready,false);
assert.equal(pending.reason,"quote_ownership_and_freshness_unverified");
assert.equal(pending.payload,null);
assert.equal(pending.missingApprovals.length,5);
const approvals = Object.fromEntries(pending.missingApprovals.map(k=>[k,true]));
const fullyApproved = planInquiryOrchestration({record,guest,approvals});
assert.equal(fullyApproved.ready,false);
assert.equal(fullyApproved.payload,null);
assert.equal(planInquiryOrchestration({record:{...record,quoteId:"invalid"},guest,approvals}).reason,"missing_quote_id");

assert.deepEqual(planPostSubmission({claimed:false,response:{status:201,body:{_id:record.quoteId}}}),{
  state:"blocked",retryAutomatically:false,requiresReconciliation:false
});
for (const response of [
  {status:201,body:{_id:record.quoteId}},
  {status:201,body:{}},
  {status:500},
  {status:409},
  {transportError:true}
]) {
  const result=planPostSubmission({claimed:true,response});
  assert.equal(result.retryAutomatically,false);
  assert.equal(result.requiresReconciliation,true);
  assert.equal(result.canMarkSucceeded,false);
}
console.log("PASS: integrated inquiry planning remains blocked until real provenance and Guesty permissions are verified.");
