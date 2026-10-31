import assert from "node:assert/strict";
import {verifyGoogleIdToken} from "../gmail-archive-oauth/google-id-token.js";
const key=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const jwk={...(await crypto.subtle.exportKey("jwk",key.publicKey)),kid:"fictional-key",alg:"RS256",use:"sig"};
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString("base64url");
const now=1800000000,clientId="fictional-client",nonce="fictional-nonce";
async function signed(claims){
 const prefix=encode({alg:"RS256",typ:"JWT",kid:"fictional-key"})+"."+encode(claims);
 const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key.privateKey,new TextEncoder().encode(prefix));
 return prefix+"."+Buffer.from(sig).toString("base64url");
}
const claims={iss:"https://accounts.google.com",aud:clientId,nonce,exp:now+300,email_verified:true,email:"info@zyenhomes.com",sub:"fictional-sub"};
const jwt=await signed(claims);
assert.equal((await verifyGoogleIdToken(jwt,{jwks:{keys:[jwk]},clientId,nonce,nowSeconds:now})).mailbox,"info@zyenhomes.com");
await assert.rejects(()=>verifyGoogleIdToken(jwt.slice(0,-3)+"abc",{jwks:{keys:[jwk]},clientId,nonce,nowSeconds:now}));
await assert.rejects(()=>verifyGoogleIdToken(jwt,{jwks:{keys:[]},clientId,nonce,nowSeconds:now}));
await assert.rejects(()=>verifyGoogleIdToken(await signed({...claims,email:"admin@zyenhomes.com"}),{jwks:{keys:[jwk]},clientId,nonce,nowSeconds:now}));
console.log("PASS: fictional RSA-signed JWT, tampering, untrusted key and wrong mailbox rejection.");
console.log("No Google JWKS fetch, OAuth exchange, Gmail access or production deployment.");
