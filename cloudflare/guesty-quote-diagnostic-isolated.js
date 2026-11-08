// ISOLATED TEST WORKER ONLY. Never import from cloudflare/worker.js.
// Read-only quote check. No inquiry/reservation write endpoints.
import {requestGuestyOpenApiToken} from "./guesty-open-api-auth.js";
import {verifyGuestyQuoteReadOnly} from "./guesty-quote-readonly.js";

export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  const reply=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
  if(url.pathname!=="/internal/quote-readonly") return reply({success:false,reason:"not_found"},404);
  if(request.method!=="GET") return reply({success:false,reason:"method_not_allowed"},405);
  if(env?.GUESTY_QUOTE_READONLY_DIAGNOSTIC_ENABLED!=="true")
   return reply({success:false,reason:"diagnostic_disabled"},403);
  // No public unauthenticated diagnostic: require Cloudflare Access JWT to be
  // validated upstream, AND an explicit local Access-verified gate. A header
  // alone is never treated as proof of authentication.
  if(env?.GUESTY_QUOTE_DIAGNOSTIC_ACCESS_VERIFIED!=="true")
   return reply({success:false,reason:"access_not_verified"},403);
  // Inputs are provisioned as Worker variables, never accepted from URL/body.
  const quoteId=env?.GUESTY_DIAGNOSTIC_QUOTE_ID;
  const listingId=env?.GUESTY_DIAGNOSTIC_LISTING_ID;
  const checkIn=env?.GUESTY_DIAGNOSTIC_CHECK_IN;
  const checkOut=env?.GUESTY_DIAGNOSTIC_CHECK_OUT;
  const guests=Number(env?.GUESTY_DIAGNOSTIC_GUESTS);
  if(typeof quoteId!=="string"||!/^[a-f0-9]{24}$/i.test(quoteId))
   return reply({success:false,reason:"quote_not_configured"},503);
  const token=await requestGuestyOpenApiToken({env,transport:fetch});
  if(!token.ok) return reply({success:false,reason:"authentication_unavailable"},503);
  const result=await verifyGuestyQuoteReadOnly({
   quoteId,listingId,checkIn,checkOut,guests,
   token:token.accessToken,transport:fetch
  });
  // Never return quote payload, token, email, names, listing/quote IDs.
  return reply({success:result.verified===true,
    reason:result.reason,writeAuthorized:false});
 }
};
