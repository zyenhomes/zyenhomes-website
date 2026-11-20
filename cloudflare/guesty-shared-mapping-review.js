// Offline adapter: shared property mapping is not independent Guesty account proof.
import {lookupBookingRequestListing} from "./booking-request-listings.js";
import {reviewStoredRequestForInquiry} from "./guesty-verified-guest-mapping.js";
export async function reviewMappedStoredRequest({
 record,verifiedAccountListingId,verifiedGuest,claimToken,attemptId,token,transport,now
}={}) {
 const deny=reason=>Object.freeze({ready:false,reason,canSend:false,canClaim:false,
  writeAuthorized:false,retryAutomatically:false});
 const mapped=lookupBookingRequestListing(record?.property_id);
 if(!mapped)return deny("property_not_in_booking_engine_mapping");
 if(mapped!==verifiedAccountListingId)
  return deny("independent_account_listing_verification_required");
 const result=await reviewStoredRequestForInquiry({
  record,verifiedMapping:{propertyId:record.property_id,listingId:mapped,accountVerified:true},
  verifiedGuest,claimToken,attemptId,token,transport,now
 });
 if(!result.propertyMappingVerified||!result.guestIdentityVerified)return deny(result.reason);
 return Object.freeze({...result,ready:false,canSend:false,canClaim:false,
  writeAuthorized:false,retryAutomatically:false});
}
