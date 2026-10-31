// Undeployed OAuth callback orchestration. Dependencies must be supplied by a
// separately reviewed Worker adapter. No tokens or codes are logged.
import {callbackError} from "./oauth-security.js";
export async function processOAuthCallback({request,origin,consumeState,exchangeCode,verifyMailbox,encryptRefreshToken,saveEncryptedToken}){
 const url=new URL(request.url);
 if(url.pathname!=="/oauth/google/callback")return {status:404,reason:"not_found"};
 const error=callbackError(url,origin);
 if(error)return {status:400,reason:error};
 // consumeState MUST atomically consume server-side state and decrypt verifier.
 const session=await consumeState(url.searchParams.get("state"));
 if(!session||typeof session.verifier!=="string")return {status:400,reason:"invalid_session"};
 const tokens=await exchangeCode({code:url.searchParams.get("code"),verifier:session.verifier});
 if(!tokens||typeof tokens.accessToken!=="string"||!tokens.accessToken)return {status:502,reason:"invalid_token_response"};
 const mailbox=await verifyMailbox(tokens.accessToken);
 if(mailbox!=="info@zyenhomes.com")return {status:403,reason:"wrong_mailbox"};
 const scopes=new Set((tokens.scope||"").split(/\s+/).filter(Boolean));
 if(!scopes.has("https://www.googleapis.com/auth/gmail.insert"))return {status:403,reason:"missing_scope"};
 if(typeof tokens.refreshToken!=="string"||!tokens.refreshToken)return {status:409,reason:"refresh_token_missing"};
 const encrypted=await encryptRefreshToken(tokens.refreshToken);
 await saveEncryptedToken({mailbox,encrypted,scope:"https://www.googleapis.com/auth/gmail.insert"});
 return {status:200,reason:"authorized"};
}
