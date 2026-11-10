import assert from "node:assert/strict";
import {assessInquiryLifecycle as assess} from "../cloudflare/guesty-booking-engine-inquiry-lifecycle.js";
const id="a".repeat(24);
const base={claimCommitted:true,claimAuditCommitted:true,postAttempted:true,
 responseStatus:200,responseBody:{_id:id,status:"reserved"}};
const reconciliation={independentlyFetched:true,reservationId:id,quoteMatches:true,
 listingMatches:true,accountMatches:true,inquiryStatusVerified:true};
const cases=[
 [{...base,claimCommitted:false},"blocked"],
 [{...base,claimAuditCommitted:false},"blocked"],
 [{...base,postAttempted:false},"claimed_no_send"],
 [{...base,transportError:true},"uncertain"],
 [{...base,responseStatus:502},"uncertain"],
 [{...base,responseStatus:400},"uncertain"],
 [{...base,responseBody:{status:"reserved"}},"uncertain"],
 [base,"needs_reconciliation"],
 [{...base,reconciliation:{...reconciliation,quoteMatches:false}},"needs_reconciliation"],
 [{...base,reconciliation:{...reconciliation,accountMatches:false}},"needs_reconciliation"],
 [{...base,reconciliation:{...reconciliation,inquiryStatusVerified:false}},"needs_reconciliation"],
 [{...base,reconciliation:{...reconciliation,reservationId:"b".repeat(24)}},"needs_reconciliation"],
 [{...base,reconciliation},"verified_pending_manual_commit"]
];
for(const [input,expected] of cases){
 const result=assess(input);
 assert.equal(result.state,expected);
 assert.equal(result.canRetryAutomatically,false);
 assert.equal(result.canSendInquiry,false);
 assert.equal(result.canMarkSucceeded,false);
}
console.log("PASS: offline lifecycle covers claimed-no-send, HTTP errors, timeout, missing ID and independent verification.");
