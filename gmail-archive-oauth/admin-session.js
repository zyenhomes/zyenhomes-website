// Offline admin-session cookie and validation primitives.
// This is NOT a complete login implementation: issuance must follow a verified
// Google ID token and sessions must be stored server-side with atomic expiry.
const NAME="__Host-zyen_admin";
export function adminCookie(sessionId,{maxAge=900}={}){
 if(typeof sessionId!=="string"||!/^[0-9a-f]{64}$/.test(sessionId))throw Error("Invalid session ID");
 if(!Number.isSafeInteger(maxAge)||maxAge<1||maxAge>900)throw Error("Invalid session lifetime");
 return NAME+"="+sessionId+"; Path=/; Max-Age="+maxAge+"; HttpOnly; Secure; SameSite=Lax";
}
export function clearAdminCookie(){
 return NAME+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}
export function validateAdminSession(record,{now=Date.now(),expectedSubject}={}){
 if(!record||typeof record!=="object"||!expectedSubject)throw Error("Invalid admin session");
 if(record.email!=="admin@zyenhomes.com"||record.subject!==expectedSubject)throw Error("Wrong admin identity");
 if(!Number.isSafeInteger(record.createdAt)||!Number.isSafeInteger(record.expiresAt)||record.createdAt>now||record.expiresAt<=now||record.expiresAt-record.createdAt>900000)throw Error("Expired or invalid admin session");
 return true;
}
