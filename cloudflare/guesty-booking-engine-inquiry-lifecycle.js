// Offline inquiry lifecycle review. Does not call Guesty or mutate D1.
// An external POST cannot be assumed exactly-once after a timeout or crash.
import {reviewBookingEngineInquiryOutcome} from "./guesty-booking-engine-claim-review.js";
const ID=/^[a-f0-9]{24}$/i;
export function assessInquiryLifecycle({claimCommitted,claimAuditCommitted,postAttempted,
 responseStatus,responseBody,transportError,reconciliation}={}) {
 const result=(state,reason,extra={})=>Object.freeze({
  state,reason,canRetryAutomatically:false,canSendInquiry:false,
  canMarkSucceeded:false,requiresManualReview:true,...extra});
 if(claimCommitted!==true||claimAuditCommitted!==true)
  return result("blocked","claim_and_audit_not_confirmed");
 if(postAttempted!==true)
  return result("claimed_no_send","claim_held_do_not_automatically_retry");
 const response=reviewBookingEngineInquiryOutcome({claimed:true,responseStatus,responseBody,transportError});
 if(response.state!=="needs_reconciliation")
  return result("uncertain","outcome_unverified_or_failed");
 const reservationId=response.reservationId;
 if(!ID.test(reservationId??""))
  return result("uncertain","reservation_id_unverified");
 // Independent reconciliation must bind the same reservation, quote, listing,
 // account, and inquiry status; merely receiving HTTP 200 is insufficient.
 if(!reconciliation||reconciliation.independentlyFetched!==true||
   reconciliation.reservationId!==reservationId||
   reconciliation.quoteMatches!==true||
   reconciliation.listingMatches!==true||
   reconciliation.accountMatches!==true||
   reconciliation.inquiryStatusVerified!==true)
  return result("needs_reconciliation","independent_guesty_verification_required",{reservationId});
 // A positive review is still not a D1 success mutation or write authorization.
 return result("verified_pending_manual_commit","manual_database_commit_required",{reservationId,
  independentlyVerified:true});
}
