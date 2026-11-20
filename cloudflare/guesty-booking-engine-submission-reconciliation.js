// Read-only reconciliation of a previously submitted Booking Engine inquiry.
// No POST, D1 mutation, automatic retry or status confirmation.
import {verifyBookingEngineReservationReadOnly} from "./guesty-booking-engine-reservation-readonly.js";
const ID=/^[a-f0-9]{24}$/i;
export async function reviewBookingEngineSubmission({
 submission,record,accountId,ratePlanId,token,transport,bookingOption
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
 // Guesty Quick Start Guide: an Only request to book instance creates booking\n // requests with status reserved. This is valid only for that verified instance\n // setting; it is not evidence of Inbox visibility or approval behavior.\n const requestToBookStatusMatched=bookingOption==="only_request_to_book" &&\n  result.status==="reserved";\n return block(requestToBookStatusMatched\n  ?"documented_request_status_matched_manual_workflow_unverified"\n  :"booking_option_or_request_status_unverified",{\n  state:requestToBookStatusMatched\n   ?"documented_request_status_verified" :"identity_verified_status_pending",\n  requestToBookStatusMatched,
  reservationId:result.reservationId,
  observedStatus:result.status,conversationId:result.conversationId,
  accountAndStayVerified:true
 });
}
