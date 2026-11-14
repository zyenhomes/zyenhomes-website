// Independent read-only reconciliation after a separately authorized inquiry POST.
// The Open API reservation response shape is not verified against a real inquiry.
// Therefore even a matching mock record cannot mark D1 succeeded or confirm account ownership.
import {reconcileGuestyInquiryReadOnly} from "./guesty-inquiry-reconcile-readonly.js";
const ID=/^[a-f0-9]{24}$/i;
export async function reviewSubmittedInquiryReadOnly({
 record,submission,openApiToken,transport
}={}) {
 const blocked=(reason,extra={})=>Object.freeze({
  state:"manual_review",reason,canMarkSucceeded:false,
  retryAutomatically:false,canRetrySubmission:false,...extra
 });
 if(!record||!ID.test(record.guesty_quote_id??"")||
    !ID.test(record.listing_id??""))
  return blocked("booking_request_identity_unverified");
 if(submission?.state!=="needs_reconciliation"||
    !ID.test(submission.reservationId??""))
  return blocked("submission_not_reconcilable");
 const result=await reconcileGuestyInquiryReadOnly({
  reservationId:submission.reservationId,quoteId:record.guesty_quote_id,
  listingId:record.listing_id,token:openApiToken,transport
 });
 if(result.verified!==true)return blocked(result.reason,{
  reservationId:submission.reservationId
 });
 // A matching reservation still needs account identity and actual schema
 // verification. In particular a sample 'reserved' status is not an inquiry.
 return blocked("account_and_real_response_schema_verification_required",{
  state:"matched_pending_manual_verification",
  reservationId:submission.reservationId,
  quoteAndListingMatched:true
 });
}
