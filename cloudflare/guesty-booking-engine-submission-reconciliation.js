// Read-only reconciliation of a previously submitted Booking Engine inquiry.
// No POST, D1 mutation, automatic retry or status confirmation.
import {verifyBookingEngineReservationReadOnly} from "./guesty-booking-engine-reservation-readonly.js";
const ID=/^[a-f0-9]{24}$/i;
export async function reviewBookingEngineSubmission({
 submission,record,accountId,ratePlanId,token,transport
}={}) {
 const block=(reason,extra={})=>Object.freeze({state:"manual_review",reason,
  canMarkSucceeded:false,canRetrySubmission:false,canConfirmInquiry:false,...extra});
 if(submission?.state!=="needs_reconciliation"||!ID.test(submission.reservationId??""))
  return block("submission_reservation_id_unverified");
 if(!record||!ID.test(record.listing_id??"")||!ID.test(accountId??"")||
   !ID.test(ratePlanId??"")||!Number.isSafeInteger(record.guests))
  return block("request_account_or_rate_plan_unverified");
 const result=await verifyBookingEngineReservationReadOnly({
  reservationId:submission.reservationId,accountId,unitTypeId:record.listing_id,
  ratePlanId,guestsCount:record.guests,checkIn:record.check_in,checkOut:record.check_out,
  token,transport
 });
 if(!result.verified)return block(result.reason,{reservationId:submission.reservationId});
 // Docs confirm status exists, but not the semantics of inquiry vs reserved.
 // A successful identity match is not proof of a manually approvable inquiry.
 return block("manual_approval_status_not_verified",{
  state:"identity_verified_status_pending",
  reservationId:result.reservationId,
  observedStatus:result.status,conversationId:result.conversationId,
  accountAndStayVerified:true
 });
}
