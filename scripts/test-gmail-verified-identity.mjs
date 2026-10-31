import assert from "node:assert/strict";
import {verifyArchiveIdentity} from "../gmail-archive-oauth/verify-archive-identity.js";
const keys=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const jwk={...(await crypto.subtle.exportKey("jwk",keys.publicKey)),kid:"test-key",alg:"RS256",use:"sig"};
const enc=v=>Buffer.from(JSON.stringify(v)).toString("base64url");
const now=1800000000,nonce="test-nonce",clientId="test-client";
async function jwt(claims){
 const payload=enc({iss:"https://accounts.google.com",aud:clientId,nonce,exp:now+300,email_verified:true,email:"info@zyenhomes.com",sub:"test-sub",...claims});
 const prefix=enc({alg:"RS256",typ:"JWT",kid:"test-key"})+"."+payload;
 const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",keys.privateKey,new TextEncoder().encode(prefix));
 return prefix+"."+Buffer.from(signature).toString("base64url");
}
let count=0;
const fetchImpl=async(url)=>{count++;assert.equal(url,"https://www.googleapis.com/oauth2/v3/certs");return {ok:true,json:async()=>({keys:[jwk]})};};
const opts={clientId,fetchImpl,nowSeconds:now};
assert.equal(await verifyArchiveIdentity(await jwt({}),nonce,opts),"info@zyenhomes.com");
assert.equal(count,1);
await assert.rejects(()=>verifyArchiveIdentity(await jwt({email:"admin@zyenhomes.com"}),nonce,opts),/Wrong archive mailbox/);
await assert.rejects(()=>verifyArchiveIdentity(await jwt({}),"wrong-nonce",opts),/nonce mismatch/);
await assert.rejects(()=>verifyArchiveIdentity(await jwt({exp:now-1}),nonce,opts),/Expired/);
console.log("PASS: mocked trusted JWKS retrieval and cryptographic mailbox identity verification");
console.log("No real Google API calls, tokens or production changes");
