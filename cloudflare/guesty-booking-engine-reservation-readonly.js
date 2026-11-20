// Read-only Booking Engine reservation schema verification.
// Based on documented GET reservation response fields. Never writes or confirms inquiry status.
const ID=/^[a-f0-9]{24}$/i;
export async function verifyBookingEngineReservationReadOnly({
 reservationId,accountId,unitTypeId,ratePlanId,guestsCount,checkIn,checkOut,
 token,transport
}={}) {
 const deny=reason=>Object.freeze({verified:false,reason,canMarkSucceeded:false,
  retryAutomatically:false,canConfirmInquiry:false});
 if(![reservationId,accountId,unitTypeId,ratePlanId].every(x=>ID.test(x??""))||
   !Number.isSafeInteger(guestsCount)||guestsCount<1||
   !/^\d{4}-\d{2}-\d{2}$/.test(checkIn??"")||
   !/^\d{4}-\d{2}-\d{2}$/.test(checkOut??"")||checkOut<=checkIn||
   typeof token!=="string"||token.length<8||typeof transport!=="function")
  return deny("invalid_verification_input");
 let response;
 try {
  response=await transport("https://booking.guesty.com/api/reservations/"+reservationId,{
   method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"}
  });
 }catch{return deny("lookup_uncertain");}
 if(!response?.ok)return deny("lookup_rejected");
 let raw;
 try {raw=await response.json();}catch{return deny("invalid_response");}
 const value=raw?.results??raw;
 const reservation=Array.isArray(value)?(value.length===1?value[0]:null):value;
 if(!reservation||typeof reservation!=="object")return deny("invalid_reservation_shape");
 if(reservation._id!==reservationId)return deny("reservation_id_mismatch");
 if(reservation.accountId!==accountId)return deny("account_id_mismatch");
 if(reservation.unitTypeId!==unitTypeId)return deny("unit_type_id_mismatch");
 if(reservation.ratePlanId!==ratePlanId)return deny("rate_plan_id_mismatch");
 if(reservation.guestsCount!==guestsCount)return deny("guest_count_mismatch");
 if(reservation.checkInDateLocalized!==checkIn||
    reservation.checkOutDateLocalized!==checkOut)return deny("stay_dates_mismatch");
 if(typeof reservation.status!=="string"||!reservation.status.trim())
  return deny("reservation_status_missing");
 // Documentation does not prove which status denotes an unconfirmed inquiry.
 // Even exact identity/stay matches cannot confirm an inquiry or mark D1 succeeded.
 return Object.freeze({verified:true,reason:"identity_and_stay_verified_status_pending",
  reservationId,status:reservation.status,
  conversationId:ID.test(reservation.conversationId??"")?reservation.conversationId:null,
  canMarkSucceeded:false,retryAutomatically:false,canConfirmInquiry:false,
  requiresManualInquiryStatusVerification:true});
}
