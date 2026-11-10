// Guesty Booking Engine inquiry adapter. NOT imported by production worker.js.
// No live transport or credentials. Preparation is always non-executable.
const ID=/^[a-f0-9]{24}$/i;
export function prepareBookingEngineInquiry({quoteId,ratePlanId,firstName,lastName,email,phone,reservedUntil=-1}={}) {
 if(!ID.test(quoteId??"")||!ID.test(ratePlanId??""))throw Error("invalid_quote_or_rate_plan");
 if(![-1,12,24,36,48,72].includes(reservedUntil))throw Error("invalid_hold_duration");
 const validName=x=>typeof x==="string"&&x.trim().length>0&&x.trim().length<=100;
 if(!validName(firstName)||!validName(lastName))throw Error("invalid_guest_name");
 if(typeof email!=="string"||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error("invalid_guest_email");
 if(phone!==undefined&&(typeof phone!=="string"||phone.trim().length>32||phone.trim().length<5))
   throw Error("invalid_guest_phone");
 const guest={firstName:firstName.trim(),lastName:lastName.trim(),email:email.trim()};
 if(phone!==undefined)guest.phone=phone.trim();
 return Object.freeze({
  endpoint:"https://booking.guesty.com/api/reservations/quotes/"+quoteId+"/inquiry",
  method:"POST",
  body:Object.freeze({ratePlanId,reservedUntil,guest:Object.freeze(guest)}),
  executable:false,writeAuthorized:false,requiresExplicitLiveApproval:true
 });
}
export function classifyBookingEngineInquiryResult({status,body,error}={}) {
 const uncertain=reason=>Object.freeze({state:"uncertain",reason,retryAutomatically:false,canMarkSucceeded:false,reservationId:null});
 if(error||!Number.isInteger(status)||status>=500)return uncertain("transport_or_server_uncertain");
 if(status>=200&&status<300){
  const id=body?._id;
  if(!ID.test(id??""))return uncertain("missing_reservation_id");
  // Documented 200 response may show "reserved" even for inquiry flow.
  // Do not infer confirmed/inquiry status; independently verify in Guesty.
  return Object.freeze({state:"needs_reconciliation",reservationId:id,
    responseStatus:typeof body.status==="string"?body.status:null,
    retryAutomatically:false,canMarkSucceeded:false});
 }
 return Object.freeze({state:"manual_review",httpStatus:status,
  retryAutomatically:false,canMarkSucceeded:false,reservationId:null});
}
