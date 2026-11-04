// Authorization-start gate for a future Cloudflare Access-protected Worker.
// Caller MUST cryptographically verify the Cloudflare Access JWT against the
// account's trusted Access JWKS and expected application audience first.
// Unverified headers or decoded JWT payloads are NEVER sufficient.
export function requireArchiveAdmin(verifiedClaims,{audience,allowedEmail="admin@zyenhomes.com",nowSeconds=Math.floor(Date.now()/1000)}){
 if(!verifiedClaims||typeof verifiedClaims!=="object")throw Error("Missing verified administrator claims");
 if(typeof audience!=="string"||!audience)throw Error("Missing Access audience");
 const audiences=Array.isArray(verifiedClaims.aud)?verifiedClaims.aud:[verifiedClaims.aud];
 if(!audiences.includes(audience))throw Error("Wrong Access application audience");
 if(!Number.isSafeInteger(verifiedClaims.exp)||verifiedClaims.exp<=nowSeconds)throw Error("Expired Access identity");
 if(typeof verifiedClaims.email!=="string"||verifiedClaims.email.toLowerCase()!==allowedEmail.toLowerCase())throw Error("Unauthorized administrator");
 if(typeof verifiedClaims.sub!=="string"||!verifiedClaims.sub)throw Error("Missing administrator subject");
 return {email:allowedEmail,subject:verifiedClaims.sub};
}
