// Undeployed admin-login callback orchestration.
// All injected adapters must be independently reviewed before live use.
// The state must be consumed atomically and the Google ID token cryptographically verified.
export async function completeAdminLogin({
 state,code,consumeLoginState,exchangeCode,verifyAdminIdentity,
 createSession,now=Date.now()
}){
 if(typeof state!=="string"||!/^[0-9a-f]{64}$/.test(state)||typeof code!=="string"||!code)
  return {status:400,reason:"invalid_callback"};
 // Consume before exchanging authorization code; replay must fail closed.
 const login=await consumeLoginState(state);
 if(!login||typeof login.verifier!=="string"||typeof login.nonce!=="string")
  return {status:400,reason:"invalid_session"};
 const tokens=await exchangeCode({code,verifier:login.verifier});
 if(typeof tokens?.idToken!=="string"||!tokens.idToken)
  return {status:502,reason:"missing_identity_token"};
 // Must verify Google signature, issuer, audience, nonce, expiry and verified email.
 const identity=await verifyAdminIdentity(tokens.idToken,login.nonce);
 if(identity?.email!=="admin@zyenhomes.com"||typeof identity.subject!=="string"||!identity.subject)
  return {status:403,reason:"unauthorized_admin"};
 // Adapter must generate random cookie/CSRF values and persist hashed session data.
 const result=await createSession({subject:identity.subject,now});
 if(!result?.sessionCookie)return {status:503,reason:"session_unavailable"};
 return {status:200,reason:"authenticated",sessionCookie:result.sessionCookie};
}
