// Undeployed OAuth authorization URL builder. The caller must persist a
// one-time encrypted state/PKCE/nonce session before presenting the URL.
// Never expose this endpoint without administrator authentication and CSRF protection.
import {randomUrlSafe,pkceChallenge} from "./oauth-security.js";
const INSERT="https://www.googleapis.com/auth/gmail.insert";
export async function prepareGoogleAuthorization({clientId,redirectUri,persistSession,now=Date.now()}){
 if(typeof clientId!=="string"||!clientId||typeof persistSession!=="function")throw Error("Missing OAuth configuration");
 const redirect=new URL(redirectUri);
 if(redirect.protocol!=="https:"||redirect.username||redirect.password||redirect.hash||redirect.search)throw Error("Invalid OAuth redirect URI");
 const state=randomUrlSafe(32),verifier=randomUrlSafe(48),nonce=randomUrlSafe(32);
 const challenge=await pkceChallenge(verifier);
 // persistSession must atomically store the state and encrypt the verifier and nonce,
 // with a 10-minute expiry, before returning. Fail closed if persistence fails.
 await persistSession({state,verifier,nonce,createdAt:now,expiresAt:now+600000});
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 for(const [key,value] of Object.entries({
  client_id:clientId,redirect_uri:redirect.href,response_type:"code",
  scope:["openid","email",INSERT].join(" "),state,nonce,
  code_challenge:challenge,code_challenge_method:"S256",
  access_type:"offline",prompt:"consent"
 }))url.searchParams.set(key,value);
 return url.href;
}
