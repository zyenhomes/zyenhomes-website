// Isolated, explicitly scoped claim-to-inquiry workflow. NOT imported by Worker.
// This can send only when an external caller supplies separate explicit approval
// and real injected transport. It never retries or marks synchronization successful.
import {reviewAndClaimInquiry} from "./guesty-claim-orchestration.js";
import {submitGuestyInquiryControlled} from "./guesty-booking-engine-controlled-transport.js";
export async function executeControlledInquiryWorkflow({
 request,env,record,guest,claimToken,attemptId,token,quoteTransport,now,db,
 claimAuthorization,writeAuthorization,inquiryTransport
}={}) {
 const block=(reason,extra={})=>Object.freeze({state:"blocked",reason,
  retryAutomatically:false,canMarkSucceeded:false,...extra});
 // IMPORTANT: refuse write before even attempting D1 claim unless authorization
 // matches the request, attempt and quote. No side effects for unapproved calls.
 if(writeAuthorization?.explicitLiveWriteApproval!==true||
    writeAuthorization?.approvedRequestId!==record?.request_id||
    writeAuthorization?.approvedAttemptId!==attemptId||
    writeAuthorization?.approvedQuoteId!==record?.guesty_quote_id)
  return block("explicit_scoped_live_write_approval_required");
 const claim=await reviewAndClaimInquiry({
  request,env,record,guest,claimToken,attemptId,token,quoteTransport,now,db,
  authorization:claimAuthorization
 });
 if(claim.state!=="claimed"||claim.claimCommitted!==true||claim.auditCommitted!==true)
  return block(claim.reason??"claim_not_committed");
 // Claimed records must never be retried automatically, even if transport fails.
 const outcome=await submitGuestyInquiryControlled({
  prepared:claim.prepared,claim:{claimed:true,claimCommitted:true,auditCommitted:true,
   canSendInquiry:false,requestId:claim.requestId,attemptId:claim.attemptId},
  authorization:writeAuthorization,token,transport:inquiryTransport
 });
 return Object.freeze({...outcome,canMarkSucceeded:false,retryAutomatically:false,
  requiresIndependentReconciliation:true});
}
