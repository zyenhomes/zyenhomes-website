// Read-only quote lookup + offline claim preparation.
// Never executes D1 statements or a Guesty inquiry POST.
import {retrieveBookingEngineQuoteReadOnly} from "./guesty-booking-engine-quote-readonly.js";
import {reviewBookingEngineInquiryClaim} from "./guesty-booking-engine-claim-review.js";
export async function reviewInquiryFromRetrievedQuote({
 record,guest,claimToken,attemptId,token,transport,now
}={}) {
 const deny=(reason)=>Object.freeze({ready:false,reason,writeAuthorized:false,
  canClaim:false,canSend:false,retryAutomatically:false});
 if(!record||record.guesty_sync_status!=="pending"||
   record.guesty_sync_claim_token||record.guesty_sync_attempt_count!==0)
  return deny("not_pending_or_already_attempted");
 const retrieved=await retrieveBookingEngineQuoteReadOnly({
  quoteId:record.guesty_quote_id,token,transport
 });
 if(!retrieved.verified)return deny(retrieved.reason);
 const reviewed=reviewBookingEngineInquiryClaim({
  record,quoteResponse:retrieved.quote,guest,claimToken,attemptId,now
 });
 if(!reviewed.claimPlan||!reviewed.prepared)return deny(reviewed.reason);
 return Object.freeze({ready:false,reason:"offline_review_only",
  writeAuthorized:false,canClaim:false,canSend:false,retryAutomatically:false,
  quoteVerified:true,ratePlanVerified:reviewed.ratePlanVerified,
  claimPlan:reviewed.claimPlan,prepared:reviewed.prepared});
}
