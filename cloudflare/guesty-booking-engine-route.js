// Disabled production inquiry route: authentication preflight, then fail closed.
// Never executes Guesty POST, D1 claims, quote lookup, or token request.
import {assessInternalInquiryRequest} from "./guesty-booking-engine-auth-preflight.js";
import {reviewBookingEngineInquiryClaim} from "./guesty-booking-engine-claim-review.js";
import {assessInquiryLifecycle} from "./guesty-booking-engine-inquiry-lifecycle.js";
export const BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED=false;
export const bookingEngineInquiryDependencies=Object.freeze({
 reviewBookingEngineInquiryClaim,assessInquiryLifecycle
});
export function handleDisabledBookingEngineInquiry(request,env) {
 if(BOOKING_ENGINE_INQUIRY_ROUTE_ENABLED!==false)
   throw Error("Inquiry route must remain disabled until separately reviewed");
 const auth=assessInternalInquiryRequest({request,env});
 return Response.json({
  success:false,
  code:auth.authenticated?"INQUIRY_SUBMISSION_DISABLED":"INQUIRY_REQUEST_REJECTED",
  message:auth.authenticated?"Guesty inquiry submission is not enabled":"Request not authorized",
 },{status:auth.status,headers:{"Cache-Control":"no-store"}});
}
