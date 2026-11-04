import assert from "node:assert/strict";
import {handleAdminLoginCallback} from "../gmail-archive-oauth/admin-login-route.js";
const origin="https://example.test",state="a".repeat(64),session="b".repeat(64);
const request=new Request(origin+"/admin/google/callback?state="+state+"&code=fake");
const deps={
 expectedOrigin:origin,
 consumeLoginState:async()=>({verifier:"v".repeat(64),nonce:"fake-nonce"}),
 exchangeCode:async()=>({idToken:"fake-id-token"}),
 verifyAdminIdentity:async()=>({email:"admin@zyenhomes.com",subject:"fake-sub"}),
 createSession:async()=>({sessionCookie:session})
};
const ok=await handleAdminLoginCallback(request,deps);
assert.equal(ok.status,200);
assert.match(ok.headers.get("Set-Cookie"),/HttpOnly; Secure; SameSite=Lax/);
assert.equal((await handleAdminLoginCallback(new Request(origin+"/admin/google/callback?state="+state+"&code=fake&code=again"),deps)).status,400);
assert.equal((await handleAdminLoginCallback(new Request(origin+"/admin/google/callback?error=access_denied"),deps)).status,400);
assert.equal((await handleAdminLoginCallback(new Request("https://evil.test/admin/google/callback?state="+state+"&code=fake"),deps)).status,400);
assert.equal((await handleAdminLoginCallback(request,{...deps,verifyAdminIdentity:async()=>({email:"info@zyenhomes.com",subject:"fake"})})).status,403);
console.log("PASS: synthetic admin callback route, cookie flags, invalid origin, duplicate code and wrong identity");
console.log("Not wired to the deployed Worker; no real Google or D1 access.");
