// Deliberately disabled production route scaffold. No Guesty POST, D1 claim,
// quote lookup, or token request. Not a functioning inquiry submission endpoint.
import {reviewBookingEngineInquiryClaim} from "./guesty-booking-engine-claim-review.js";
import {assessInquiryLifecycle} from "./guesty-booking-engine-inquiry-lifecycle.js";
export const BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED=false;
export const bookingEngineInquiryDependencies=Object.freeze({
 reviewBookingEngineInquiryClaim,assessInquiryLifecycle
});
export function handleDisabledBookingEngineInquiry(request,env) {
 // Compile-time kill switch is mandatory; env vars alone cannot enable writes.
 if(BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED!==false)
   throw Error("Inquiry route must remain disabled until separately reviewed");
 return Response.json({
  success:false,code:"INQUIRY_SUBMISSION_DISABLED",
  message:"Guesty inquiry submission is not enabled"
 },{status:503,headers:{"Cache-Control":"no-store"}});
}
