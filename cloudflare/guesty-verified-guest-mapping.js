// Offline bridge from stored website booking requests to Guesty inquiry preparation.
// Requires trusted listing/account mapping and separately verified guest names.
// No Worker import, D1 mutation, Guesty POST, or automatic retry.
import {normalizeBookingRequestForInquiry} from "./guesty-request-identity-mapping.js";
import {reviewInquiryFromRetrievedQuote} from "./guesty-booking-engine-quote-claim-integration.js";
const blocked=reason=>Object.freeze({ready:false,reason,canSend:false,canClaim:false,writeAuthorized:false,retryAutomatically:false});
export async function reviewStoredRequestForInquiry({
 record,verifiedMapping,verifiedGuest,claimToken,attemptId,token,transport,now
}={}) {
 const mapped=normalizeBookingRequestForInquiry({record,verifiedMapping});
 if(!mapped.verified)return blocked(mapped.reason);
 const first=verifiedGuest?.firstName,last=verifiedGuest?.lastName;
 if(typeof first!=="string"||!first.trim()||typeof last!=="string"||!last.trim()||
    typeof verifiedGuest.email!=="string"||
    verifiedGuest.email.trim().toLowerCase()!==record.guest_email.trim().toLowerCase()||
    verifiedGuest.nameVerified!==true||
    (first.trim()+" "+last.trim()).replace(/\s+/g," ")!==record.guest_name.trim().replace(/\s+/g," "))
  return blocked("separate_guest_identity_unverified");
 const reviewed=await reviewInquiryFromRetrievedQuote({
  record:mapped.normalized,guest:{firstName:first.trim(),lastName:last.trim(),
   email:verifiedGuest.email.trim(),phone:record.guest_phone},
  claimToken,attemptId,token,transport,now
 });
 if(!reviewed.quoteVerified||!reviewed.ratePlanVerified||!reviewed.claimPlan||!reviewed.prepared)
  return blocked(reviewed.reason);
 return Object.freeze({...reviewed,ready:false,canSend:false,canClaim:false,
  writeAuthorized:false,retryAutomatically:false,
  propertyMappingVerified:true,guestIdentityVerified:true});
}
