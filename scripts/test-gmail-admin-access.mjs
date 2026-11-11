import assert from "node:assert/strict";
import {requireArchiveAdmin} from "../gmail-archive-oauth/admin-access.js";
const now=1800000000;
const claims={aud:["fictional-access-app"],exp:now+300,email:"admin@zyenhomes.com",sub:"fictional-admin-sub"};
const options={audience:"fictional-access-app",nowSeconds:now};
assert.equal(requireArchiveAdmin(claims,options).email,"admin@zyenhomes.com");
for(const patch of [{email:"info@zyenhomes.com"},{aud:"other-app"},{exp:now},{sub:""},{email:"attacker@example.test"}]){
 assert.throws(()=>requireArchiveAdmin({...claims,...patch},options));
}
assert.throws(()=>requireArchiveAdmin(claims,{audience:"",nowSeconds:now}));
console.log("PASS: fictional verified-claims administrator allowlist, audience, expiration and subject checks.");
console.log("No real Cloudflare Access JWT verification or production authorization.");
