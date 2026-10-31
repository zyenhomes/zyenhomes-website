import assert from "node:assert/strict";
import {requireArchiveMailbox} from "../gmail-archive-oauth/mailbox-identity.js";
const now=1800000000;
const claims={iss:"https://accounts.google.com",aud:"fictional-client",nonce:"fictional-nonce",exp:now+300,email_verified:true,email:"info@zyenhomes.com",sub:"fictional-subject"};
const options={clientId:"fictional-client",nonce:"fictional-nonce",nowSeconds:now};
assert.equal(requireArchiveMailbox(claims,options).mailbox,"info@zyenhomes.com");
for(const altered of [{email:"admin@zyenhomes.com"},{email_verified:false},{aud:"other-client"},{nonce:"wrong"},{exp:now-1},{iss:"https://untrusted.test"},{sub:""}]){
 assert.throws(()=>requireArchiveMailbox({...claims,...altered},options));
}
console.log("PASS: fictional OIDC identity claim restrictions, issuer, audience, nonce, expiry and mailbox.");
console.log("IMPORTANT: signature verification is a separate required step; no live Google calls.");
