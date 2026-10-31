import assert from "node:assert/strict";
import {getGoogleJwks} from "../gmail-archive-oauth/google-jwks.js";
let calls=0;
const valid={keys:[{kid:"fictional-key",kty:"RSA",n:"fictional-modulus",e:"AQAB",alg:"RS256",use:"sig"}]};
const result=await getGoogleJwks({now:1000,fetchImpl:async(url,options)=>{
 calls++;assert.equal(url,"https://www.googleapis.com/oauth2/v3/certs");
 assert.equal(options.redirect,"error");
 return {ok:true,json:async()=>valid};
}});
assert.equal(calls,1);assert.equal(result.keys[0].kid,"fictional-key");
assert.equal(result.expiresAt,301000);
await assert.rejects(()=>getGoogleJwks({fetchImpl:async()=>({ok:false,status:503})}),/unavailable/);
await assert.rejects(()=>getGoogleJwks({fetchImpl:async()=>({ok:true,json:async()=>({keys:[]})})}),/Invalid/);
await assert.rejects(()=>getGoogleJwks({fetchImpl:async()=>({ok:true,json:async()=>({keys:[valid.keys[0],valid.keys[0]]})})}),/duplicate/);
console.log("PASS: trusted fixed Google JWKS URL, bounded response validation, and errors.");
console.log("No network requests or real Google signing keys.");
