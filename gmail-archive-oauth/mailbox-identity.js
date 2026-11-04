// Validates verified Google OpenID Connect identity claims.
// The caller MUST first verify the ID token's signature, issuer, audience,
// expiration and nonce with a trusted OIDC verifier. Never trust decoded JWT alone.
export function requireArchiveMailbox(claims,{clientId,nonce,nowSeconds=Math.floor(Date.now()/1000)}){
 if(!claims||typeof claims!=="object")throw Error("Missing identity claims");
 if(!clientId||!nonce)throw Error("Missing identity verification context");
 if(!["https://accounts.google.com","accounts.google.com"].includes(claims.iss))throw Error("Untrusted issuer");
 if(claims.aud!==clientId)throw Error("Wrong OAuth client");
 if(claims.nonce!==nonce)throw Error("OAuth nonce mismatch");
 if(!Number.isSafeInteger(claims.exp)||claims.exp<=nowSeconds)throw Error("Expired identity token");
 if(claims.email_verified!==true)throw Error("Email not verified");
 if(typeof claims.email!=="string"||claims.email.toLowerCase()!=="info@zyenhomes.com")throw Error("Wrong archive mailbox");
 if(typeof claims.sub!=="string"||!claims.sub)throw Error("Missing Google subject");
 return {mailbox:"info@zyenhomes.com",subject:claims.sub};
}
