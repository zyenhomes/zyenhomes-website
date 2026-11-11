// Isolated, explicitly authorized database claim orchestration.
// No Worker route import, Guesty POST, token retrieval, or automatic retries.
import {assessControlledInquirySubmission} from "./guesty-booking-engine-controlled-submission.js";
import {executeInquiryClaimWithAudit} from "./guesty-d1-claim-executor.js";
export async function reviewAndClaimInquiry({
 request,env,record,guest,claimToken,attemptId,token,quoteTransport,now,db,authorization
}={}) {
 const block=(reason,extra={})=>Object.freeze({state:"blocked",reason,canSend:false,
  retryAutomatically:false,canMarkSucceeded:false,...extra});
 const preflight=await assessControlledInquirySubmission({
  request,env,record,guest,claimToken,attemptId,token,quoteTransport,now
 });
 if(!preflight.quoteVerified||!preflight.ratePlanVerified||
    !preflight.claimPlan||!preflight.prepared)return block(preflight.reason);
 if(authorization?.approvedForDatabaseClaim!==true||
    authorization.approvedRequestId!==record.request_id||
    authorization.approvedAttemptId!==attemptId)
  return block("database_claim_not_authorized");
 const claim=await executeInquiryClaimWithAudit({
  db,ids:{requestId:record.request_id,claimToken,attemptId},authorization
 });
 if(claim.claimed!==true)return block(claim.reason);
 return block("claimed_pending_independent_write_approval",{
  state:"claimed",requestId:record.request_id,attemptId,
  quoteVerified:true,ratePlanVerified:true,claimCommitted:true,auditCommitted:true,
  prepared:preflight.prepared
 });
}
