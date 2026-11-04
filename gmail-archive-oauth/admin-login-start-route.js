// Undeployed administrator login-start route.
// A future Worker adapter MUST enforce origin/CSRF checks, rate limits and
// atomic state persistence. Never authorize Gmail from this route.
import {randomUrlSafe,pkceChallenge} from "./oauth-security.js";
export async function handleAdminLoginStart(request,{
 expectedOrigin,clientId,redirectUri,persistLoginState,authorizeInitiation
}){
 const url=new URL(request.url);
 const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 if(url.pathname!=="/admin/google/start")return new Response("Not found",{status:404,headers});
 if(request.method!=="POST")return new Response("Method not allowed",{status:405,headers});
 if(url.origin!==expectedOrigin||request.headers.get("Origin")!==expectedOrigin)
  return new Response("Invalid origin",{status:403,headers});
 // This adapter must validate a short-lived, same-origin CSRF initiation token,
 // and enforce abuse protection before generating OAuth state.
 if(typeof authorizeInitiation!=="function"||await authorizeInitiation(request)!==true)
  return new Response("Unauthorized initiation",{status:403,headers});
 if(typeof persistLoginState!=="function"||!clientId||!redirectUri)
  return new Response("Not configured",{status:503,headers});
 const redirect=new URL(redirectUri);
 if(redirect.protocol!=="https:"||redirect.origin!==expectedOrigin||redirect.pathname!=="/admin/google/callback"||redirect.search||redirect.hash)
  return new Response("Invalid redirect configuration",{status:503,headers});
 const state=randomUrlSafe(32),verifier=randomUrlSafe(48),nonce=randomUrlSafe(32);
 const challenge=await pkceChallenge(verifier);
 // Atomic, expiring storage required; persist BEFORE redirecting to Google.
 await persistLoginState({state,verifier,nonce,createdAt:Date.now(),ttlSeconds:600});
 const google=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 for(const [key,value] of Object.entries({
  client_id:clientId,redirect_uri:redirect.href,response_type:"code",
  scope:"openid email",state,nonce,code_challenge:challenge,
  code_challenge_method:"S256"
 }))google.searchParams.set(key,value);
 return new Response(null,{status:303,headers:{...headers,Location:google.href}});
}
