import assert from "node:assert/strict";
import {dispatchAdminRoutes} from "../gmail-archive-oauth/admin-route-dispatcher.js";
const origin="https://example.test";
const req=(path,method="GET",headers={})=>new Request(origin+path,{method,headers});
assert.equal((await dispatchAdminRoutes(req("/admin/google/start","POST"),{})).status,503);
assert.equal((await dispatchAdminRoutes(req("/admin/google/callback?code=x&state=x"),{testMode:false})).status,503);
assert.equal((await dispatchAdminRoutes(req("/other"),{testMode:true})).status,404);
const bootstrap=await dispatchAdminRoutes(req("/admin/login/csrf","POST",{"Origin":origin}),{
 testMode:true,expectedOrigin:origin,authorizeBootstrap:()=>true
});
assert.equal(bootstrap.status,200);
const {csrfToken}=await bootstrap.json();
const cookie=bootstrap.headers.get("Set-Cookie").split(";")[0];
let stored=0;
const deps={testMode:true,expectedOrigin:origin,clientId:"fictional-client",
 redirectUri:origin+"/admin/google/callback",rateLimitKey:"admin-login:fictional-ip",
 limiter:{limit:async()=>({success:true})},authorizeInitiation:async()=>true,
 persistLoginState:async()=>{stored++;}
};
const start=await dispatchAdminRoutes(req("/admin/google/start","POST",{"Origin":origin,"Cookie":cookie,"X-Zyen-CSRF":csrfToken}),deps);
assert.equal(start.status,303);assert.equal(stored,1);
const blocked=await dispatchAdminRoutes(req("/admin/google/start","POST",{"Origin":origin,"Cookie":cookie}),deps);
assert.equal(blocked.status,403);assert.equal(stored,1);
const callback=await dispatchAdminRoutes(req("/admin/google/callback?code=fake&state="+"a".repeat(64)),{
 testMode:true,expectedOrigin:origin,
 consumeLoginState:async()=>({verifier:"v".repeat(64),nonce:"test-nonce"}),
 exchangeCode:async()=>({idToken:"fictional-id-token"}),
 verifyAdminIdentity:async()=>({email:"admin@zyenhomes.com",subject:"test-subject"}),
 createSession:async()=>({sessionCookie:"b".repeat(64)})
});
assert.equal(callback.status,200);
assert.match(callback.headers.get("Set-Cookie"),/HttpOnly/);
console.log("PASS: offline admin route dispatch, disabled gate, CSRF, login start and callback.");
console.log("Live Worker remains unchanged and disabled.");
