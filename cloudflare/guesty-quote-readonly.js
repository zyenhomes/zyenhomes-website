// Read-only verification of a Guesty Booking Engine quote through Open API.
// Never creates a reservation, changes a quote, or retries an uncertain write.
export async function verifyGuestyQuoteReadOnly({quoteId,listingId,checkIn,checkOut,guests,token,transport,now=Date.now()}={}) {
 const blocked=reason=>Object.freeze({verified:false,reason});
 if(typeof quoteId!=="string"||!/^[a-f0-9]{24}$/i.test(quoteId)||
    typeof listingId!=="string"||!/^[a-f0-9]{24}$/i.test(listingId)||
    typeof checkIn!=="string"||typeof checkOut!=="string"||
    !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)||!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)||
    checkOut<=checkIn||!Number.isSafeInteger(guests)||guests<1||
    typeof token!=="string"||!token.trim()||typeof transport!=="function")
    return blocked("invalid_verification_input");
 let response;
 try {
  response=await transport("https://open-api.guesty.com/v1/quotes/"+quoteId,{
   method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"}
  });
 } catch {return blocked("quote_lookup_unavailable");}
 if(response?.status===404) return blocked("quote_not_found_in_open_api");
 if(response?.status===410) return blocked("quote_expired");
 if(!response?.ok) return blocked("quote_lookup_rejected");
 let q;
 try {q=await response.json();} catch {return blocked("invalid_quote_response");}
 const quote=q?.results??q;
 if(!quote||Array.isArray(quote)||quote._id!==quoteId)
  return blocked("quote_identity_mismatch");
 if(quote.unitTypeId!==listingId&&quote.unitId!==listingId)
  return blocked("quote_listing_mismatch");
 if(quote.checkInDateLocalized!==checkIn||quote.checkOutDateLocalized!==checkOut)
  return blocked("quote_dates_mismatch");
 if(quote.guestsCount!==guests)
  return blocked("quote_guests_mismatch");
 if(quote.status!=="valid")
  return blocked("quote_not_valid");
 const created=Date.parse(quote.createdAt),expires=Date.parse(quote.expiresAt);
 if(!Number.isFinite(created)||!Number.isFinite(expires)||created>now||expires<=now||expires<=created)
  return blocked("quote_freshness_unverified");
 return Object.freeze({verified:true,reason:"verified_read_only",quoteId,listingId,
   // Verification alone does not authorize an inquiry write.
   writeAuthorized:false});
}
