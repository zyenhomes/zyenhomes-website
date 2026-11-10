// Controlled Guesty inquiry submission preflight, permanently non-executable.
// This is not an HTTP transport and cannot send to Guesty or mutate D1.
import {assessInternalInquiryRequest} from "./guesty-booking-engine-auth-preflight.js";
import {reviewInquiryFromRetrievedQuote} from "./guesty-booking-engine-quote-claim-integration.js";
export async function assessControlledInquirySubmission({
 request,env,record,guest,claimToken,attemptId,token,quoteTransport,now
}={}) {
 const deny=(reason,extra={})=>Object.freeze({allowed:false,reason,
  canSend:false,canClaim:false,retryAutomatically:false,...extra});
 const auth=assessInternalInquiryRequest({request,env});
 if(!auth.authenticated)return deny(auth.reason,{status:auth.status});
 // Even a valid key must not initiate lookup or mutation for an already-attempted request.
 if(!record||record.guesty_sync_status!=="pending"||
   record.guesty_sync_claim_token||record.guesty_sync_attempt_count!==0)
  return deny("request_already_attempted_or_not_pending");
 const review=await reviewInquiryFromRetrievedQuote({
  record,guest,claimToken,attemptId,token,transport:quoteTransport,now
 });
 if(!review.quoteVerified||!review.ratePlanVerified||!review.claimPlan||!review.prepared)
  return deny(review.reason);
 return deny("live_guest_write_not_implemented",{
  quoteVerified:true,ratePlanVerified:true,
  prepared:review.prepared,claimPlan:review.claimPlan,
  requires:["atomic_claim_execution","write_permission_verification",
    "independent_reconciliation","explicit_live_approval"]
 });
}
