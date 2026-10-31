// Testable Google OAuth code-exchange helper. Not wired to a deployed Worker.
// Caller must validate and atomically consume state before invoking this.
export async function exchangeGoogleCode({code,verifier,clientId,clientSecret,redirectUri,fetchImpl=fetch}) {
 if(typeof code!=="string"||!code||code.length>4096)throw Error("Invalid authorization code");
 if(typeof verifier!=="string"||!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))throw Error("Invalid PKCE verifier");
 if(!clientId||!clientSecret)throw Error("Missing OAuth client credentials");
 const redirect=new URL(redirectUri);
 if(redirect.protocol!=="https:"||redirect.username||redirect.password||redirect.hash)throw Error("Invalid HTTPS redirect URI");
 const body=new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirect.href,grant_type:"authorization_code",code_verifier:verifier});
 const response=await fetchImpl("https://oauth2.googleapis.com/token",{
  method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},
  body,redirect:"error",signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw Error("Google token exchange failed with HTTP "+response.status);
 const data=await response.json();
 if(typeof data.access_token!=="string"||!data.access_token||!Number.isFinite(data.expires_in)||data.expires_in<=0)throw Error("Invalid Google token response");
 // Never log or return a raw HTTP response. Caller must encrypt refresh token immediately.
 return {accessToken:data.access_token,refreshToken:typeof data.refresh_token==="string"?data.refresh_token:null,expiresIn:data.expires_in,scope:typeof data.scope==="string"?data.scope:"",idToken:typeof data.id_token==="string"?data.id_token:null};
}
