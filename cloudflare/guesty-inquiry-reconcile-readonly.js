// Read-only reconciliation of a Guesty inquiry after a separately authorized write.
// Does not POST, retry, mutate D1, or mark an inquiry as synchronized.
const ID=/^[a-f0-9]{24}$/i;
export async function reconcileGuestyInquiryReadOnly({reservationId,quoteId,listingId,token,transport}={}) {
 const blocked=reason=>Object.freeze({verified:false,reason,retryAutomatically:false,canMarkSucceeded:false});
 if(!ID.test(reservationId??"")||!ID.test(quoteId??"")||!ID.test(listingId??"")||
    typeof token!=="string"||!token.trim()||typeof transport!=="function")
   return blocked("invalid_reconciliation_input");
 let response;
 try {
  response=await transport("https://open-api.guesty.com/v1/reservations-v3/"+reservationId,{
   method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"}
  });
 }catch{return blocked("lookup_unavailable_manual_review");}
 if(!response?.ok)return blocked("lookup_rejected_manual_review");
 let raw;
 try {raw=await response.json();}catch{return blocked("invalid_response_manual_review");}
 const reservation=raw?.results??raw;
 if(!reservation||Array.isArray(reservation)||typeof reservation!=="object")
   return blocked("invalid_reservation_shape");
 if(reservation._id!==reservationId)return blocked("reservation_identity_mismatch");
 if(reservation.status!=="inquiry")return blocked("not_an_inquiry");
 // Guesty reservation responses may vary; fail closed until actual schema is verified.
 if(reservation.quoteId!==quoteId)return blocked("quote_reference_unverified");
 if(reservation.listingId!==listingId)return blocked("listing_reference_unverified");
 return Object.freeze({verified:true,reason:"read_only_inquiry_match",
   retryAutomatically:false,canMarkSucceeded:false,requiresManualReconciliation:true});
}
