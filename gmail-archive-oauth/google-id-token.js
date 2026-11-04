// Google ID-token verifier core. Caller must obtain JWKS from Google's
// documented trusted endpoint over HTTPS and apply bounded cache lifetimes.
// Never trust unverified JWT claims or accept arbitrary key URLs from headers.
import {requireArchiveMailbox} from "./mailbox-identity.js";
function decode64url(part){
 if(typeof part!=="string"||!/^[A-Za-z0-9_-]+$/.test(part))throw Error("Malformed JWT segment");
 const base=part.replace(/-/g,"+").replace(/_/g,"/");
 const raw=atob(base.padEnd(Math.ceil(base.length/4)*4,"="));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export async function verifyGoogleIdToken(jwt,{jwks,clientId,nonce,nowSeconds=Math.floor(Date.now()/1000)}){
 if(typeof jwt!=="string"||jwt.length>16384)throw Error("Invalid ID token");
 const parts=jwt.split(".");
 if(parts.length!==3)throw Error("Invalid JWT");
 const header=JSON.parse(new TextDecoder().decode(decode64url(parts[0])));
 if(header.alg!=="RS256"||header.typ && header.typ!=="JWT"||typeof header.kid!=="string")throw Error("Unsupported JWT header");
 if(!jwks||!Array.isArray(jwks.keys))throw Error("Missing trusted JWKS");
 const matching=jwks.keys.filter(k=>k.kid===header.kid&&k.kty==="RSA"&&(!k.alg||k.alg==="RS256")&&(!k.use||k.use==="sig"));
 if(matching.length!==1)throw Error("Untrusted signing key");
 const key=await crypto.subtle.importKey("jwk",matching[0],{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode64url(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
 if(!valid)throw Error("Invalid Google ID token signature");
 const claims=JSON.parse(new TextDecoder().decode(decode64url(parts[1])));
 return requireArchiveMailbox(claims,{clientId,nonce,nowSeconds});
}
