// Normalize persisted booking request for Guesty inquiry verification.
// Explicitly supplied trusted mapping only; never infer Guesty listing IDs.
const ID=/^[a-f0-9]{24}$/i;
export function normalizeBookingRequestForInquiry({record,verifiedMapping}={}) {
 const deny=reason=>Object.freeze({verified:false,reason,normalized:null,canWrite:false});
 if(!record||typeof record!=="object"||Array.isArray(record))
  return deny("invalid_request");
 if(typeof record.property_id!=="string"||!record.property_id.trim())
  return deny("property_id_missing");
 if(!verifiedMapping||verifiedMapping.propertyId!==record.property_id||
    !ID.test(verifiedMapping.listingId??"")||
    verifiedMapping.accountVerified!==true)
  return deny("trusted_listing_mapping_required");
 if(typeof record.guest_name!=="string"||!record.guest_name.trim()||
    typeof record.guest_email!=="string"||!record.guest_email.trim())
  return deny("guest_identity_missing");
 if(!ID.test(record.guesty_quote_id??""))
  return deny("quote_id_missing");
 const normalized=Object.freeze({...record,listing_id:verifiedMapping.listingId});
 // Name splitting is not safe for all guests: collect/verify first and last separately.
 return Object.freeze({verified:true,reason:"listing_mapping_verified_guest_names_pending",
  normalized,guestName:record.guest_name,guestEmail:record.guest_email,
  requiresSeparateGuestNames:true,canWrite:false});
}
