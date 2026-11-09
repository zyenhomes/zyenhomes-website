// ISOLATED TEST WORKER ONLY. Never import from cloudflare/worker.js.
// Read-only quote check. No inquiry/reservation write endpoints.
import {requestGuestyOpenApiToken} from "./guesty-open-api-auth.js";
import {diagnoseQuoteContract} from "./guesty-quote-contract-diagnostic.js";

export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  const reply=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
  if(url.pathname!=="/internal/quote-readonly") return reply({success:false,reason:"not_found"},404);
  if(request.method!=="GET") return reply({success:false,reason:"method_not_allowed"},405);
  if(env?.GUESTY_QUOTE_READONLY_DIAGNOSTIC_ENABLED!=="true")
   return reply({success:false,reason:"diagnostic_disabled"},403);
  // Authenticate with a dedicated random Worker secret, never Guesty credentials.
  // Compare fixed-length SHA-256 digests to avoid variable-time string comparisons.
  const secret=env?.GUESTY_QUOTE_DIAGNOSTIC_ACCESS_TOKEN;
  const auth=request.headers.get("Authorization")||"";
  const supplied=auth.startsWith("Bearer ")?auth.slice(7):"";
  if(typeof secret!=="string"||secret.length<48||secret.length>256||
     !/^[A-Za-z0-9_-]+$/.test(secret)||supplied.length<48||supplied.length>256||
     !/^[A-Za-z0-9_-]+$/.test(supplied))
   return reply({success:false,reason:"unauthorized"},401);
  const digest=async value=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));
  const a=await digest(secret),b=await digest(supplied);
  let diff=0;
  for(let i=0;i<a.length;i++) diff|=a[i]^b[i];
  if(diff!==0) return reply({success:false,reason:"unauthorized"},401);
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
  // Exactly one read-only quote lookup. Do not expose raw response content.
  let response;
  try {
   response=await fetch("https://open-api.guesty.com/v1/quotes/"+quoteId,{
    method:"GET",headers:{Authorization:"Bearer "+token.accessToken,Accept:"application/json"}
   });
  }catch{return reply({success:false,reason:"quote_lookup_unavailable",writeAuthorized:false},502);}
  if(!response.ok)return reply({success:false,reason:"quote_lookup_rejected",
    httpStatus:response.status,writeAuthorized:false},502);
  let raw;
  try {raw=await response.json();}catch{
   return reply({success:false,reason:"invalid_quote_response",writeAuthorized:false},502);
  }
  const diagnostic=diagnoseQuoteContract(raw,{quoteId,listingId,checkIn,checkOut,guests});
  // No raw quote data, IDs, names, emails, or credentials are returned.
  return reply({success:diagnostic.verified,
   reason:diagnostic.verified?"quote_verified_read_only":"quote_contract_mismatch",
   contract:diagnostic,writeAuthorized:false});
 }
};
