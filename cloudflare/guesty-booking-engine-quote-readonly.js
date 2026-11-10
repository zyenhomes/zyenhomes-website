// Booking Engine quote retrieval adapter. Read-only, injected transport.
// NOT called by production Worker. Does not fetch OAuth tokens or create inquiries.
const ID=/^[a-f0-9]{24}$/i;
export async function retrieveBookingEngineQuoteReadOnly({quoteId,token,transport}={}) {
 const deny=(reason)=>Object.freeze({verified:false,reason,quote:null,writeAuthorized:false});
 if(!ID.test(quoteId??"")||typeof token!=="string"||token.length<8||
    typeof transport!=="function")return deny("invalid_quote_lookup_input");
 let response;
 try {
  response=await transport("https://booking.guesty.com/api/reservations/quotes/"+quoteId,{
   method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"}
  });
 }catch{return deny("quote_lookup_transport_uncertain");}
 if(!response?.ok)return deny("quote_lookup_rejected");
 let raw;
 try {raw=await response.json();}catch{return deny("quote_lookup_invalid_json");}
 const data=raw?.results??raw;
 const quote=Array.isArray(data)?(data.length===1?data[0]:null):data;
 if(!quote||typeof quote!=="object"||quote._id!==quoteId)
  return deny("quote_identity_unverified");
 if(!Array.isArray(quote?.rates?.ratePlans)||quote.rates.ratePlans.length===0)
  return deny("rate_plans_unavailable");
 return Object.freeze({verified:true,reason:"quote_identity_verified_read_only",quote,
  writeAuthorized:false});
}
